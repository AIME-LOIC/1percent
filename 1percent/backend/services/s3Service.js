/* ============================================================
   S3 Service — Lab File Storage
   ============================================================
   Handles file uploads, listing, and deletion on S3.
   Falls back to local storage if S3 is not configured.
   ============================================================ */

const { adminClient } = require('../config/database');

class S3Service {
  constructor() {
    this.s3 = null;
    this.bucket = process.env.S3_BUCKET_NAME || '1percent-lab-files';
    this.region = process.env.AWS_REGION || 'us-east-1';

    // File limits by tier (number of files)
    this.TIER_LIMITS = {
      free: 5,
      starter: 5,
      pro: 10,
      unlimited: 999
    };

    // Max file size: 500KB
    this.MAX_FILE_SIZE = 500 * 1024;

    // Max total storage: Free=2MB, Pro=5MB, Unlimited=20MB
    this.TIER_STORAGE = {
      free: 2 * 1024 * 1024,
      starter: 2 * 1024 * 1024,
      pro: 5 * 1024 * 1024,
      unlimited: 20 * 1024 * 1024
    };

    this._initS3();
  }

  _initS3() {
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
        this.s3 = new S3Client({
          region: this.region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        });
        this.PutObjectCommand = PutObjectCommand;
        this.DeleteObjectCommand = DeleteObjectCommand;
        this.ListObjectsV2Command = ListObjectsV2Command;
        this.GetObjectCommand = GetObjectCommand;
        console.log('[S3] Initialized with bucket:', this.bucket);
      } else {
        console.log('[S3] No AWS credentials — using local DB storage only');
      }
    } catch (err) {
      console.warn('[S3] Could not initialize AWS SDK:', err.message);
    }
  }

  /**
   * Get user's tier from subscription
   */
  async getUserTier(userId) {
    try {
      const { data: sub } = await adminClient
        .from('user_subscriptions')
        .select('tier_slug')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .single();

      return sub?.tier_slug || 'free';
    } catch {
      return 'free';
    }
  }

  /**
   * Get file limits for a tier
   */
  getLimits(tier) {
    return {
      max_files: this.TIER_LIMITS[tier] || this.TIER_LIMITS.free,
      max_storage: this.TIER_STORAGE[tier] || this.TIER_STORAGE.free
    };
  }

  /**
   * Get user's current file count and total size
   */
  async getUserUsage(userId) {
    const { data: files, count } = await adminClient
      .from('lab_files')
      .select('id, file_size', { count: 'exact' })
      .eq('user_id', userId);

    const totalSize = (files || []).reduce((sum, f) => sum + (f.file_size || 0), 0);
    const tier = await this.getUserTier(userId);
    const limits = this.getLimits(tier);

    return {
      file_count: count || 0,
      total_size: totalSize,
      max_files: limits.max_files,
      max_storage: limits.max_storage,
      can_upload: (count || 0) < limits.max_files && totalSize < limits.max_storage,
      tier
    };
  }

  /**
   * Save a file — stores in DB always, optionally uploads to S3
   */
  async saveFile(userId, fileName, content, language) {
    const usage = await this.getUserUsage(userId);

    if (!usage.can_upload) {
      throw new Error(`File limit reached (${usage.max_files} files). Upgrade your plan for more storage.`);
    }

    const fileContent = content || '';
    const fileSize = Buffer.byteLength(fileContent, 'utf-8');

    if (fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024}KB.`);
    }

    if (fileSize + usage.total_size > usage.max_storage) {
      throw new Error(`Storage limit reached. Upgrade your plan for more space.`);
    }

    const filePath = `lab-files/${userId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const mimeType = this._getMimeType(fileName);

    // Upload to S3 if configured
    if (this.s3) {
      try {
        console.log('[S3] Uploading to bucket:', this.bucket, 'key:', filePath);
        const command = new this.PutObjectCommand({
          Bucket: this.bucket,
          Key: filePath,
          Body: fileContent,
          ContentType: mimeType,
          Metadata: { userId, language }
        });
        const result = await this.s3.send(command);
        console.log('[S3] Upload successful:', result.Location || filePath);
      } catch (err) {
        console.error('[S3] Upload FAILED:', err.name, err.message);
        console.error('[S3] Bucket:', this.bucket, 'Region:', this.region);
        // Still save to DB even if S3 fails
      }
    } else {
      console.warn('[S3] Not configured - file saved to DB only');
    }

    // Save metadata to DB
    const { data: file, error } = await adminClient
      .from('lab_files')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
        language: language || 'javascript',
        content: fileContent
      })
      .select()
      .single();

    if (error) throw error;

    return {
      file,
      usage: {
        file_count: usage.file_count + 1,
        total_size: usage.total_size + fileSize,
        max_files: usage.max_files,
        max_storage: usage.max_storage
      }
    };
  }

  /**
   * Update a file's content
   */
  async updateFile(userId, fileId, content) {
    const fileContent = content || '';
    const fileSize = Buffer.byteLength(fileContent, 'utf-8');

    if (fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024}KB.`);
    }

    // Verify ownership
    const { data: existing } = await adminClient
      .from('lab_files')
      .select('id, file_path, user_id')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (!existing) throw new Error('File not found');

    // Update S3 if configured
    if (this.s3) {
      try {
        const command = new this.PutObjectCommand({
          Bucket: this.bucket,
          Key: existing.file_path,
          Body: fileContent,
          ContentType: 'text/plain'
        });
        await this.s3.send(command);
      } catch (err) {
        console.warn('[S3] Update failed:', err.message);
      }
    }

    // Update DB
    const { error } = await adminClient
      .from('lab_files')
      .update({ content: fileContent, file_size: fileSize })
      .eq('id', fileId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Delete a file
   */
  async deleteFile(userId, fileId) {
    const { data: file } = await adminClient
      .from('lab_files')
      .select('id, file_path')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (!file) throw new Error('File not found');

    // Delete from S3
    if (this.s3) {
      try {
        const command = new this.DeleteObjectCommand({
          Bucket: this.bucket,
          Key: file.file_path
        });
        await this.s3.send(command);
      } catch (err) {
        console.warn('[S3] Delete failed:', err.message);
      }
    }

    // Delete from DB
    const { error } = await adminClient
      .from('lab_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Get all files for a user
   */
  async getUserFiles(userId) {
    const { data: files, error } = await adminClient
      .from('lab_files')
      .select('id, file_name, file_path, file_size, mime_type, language, content, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const usage = await this.getUserUsage(userId);

    return { files: files || [], usage };
  }

  /**
   * Get a single file's content
   */
  async getFile(userId, fileId) {
    const { data: file, error } = await adminClient
      .from('lab_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (error || !file) throw new Error('File not found');
    return file;
  }

  /**
   * Download file from S3 (if available)
   */
  async downloadFile(userId, fileId) {
    const file = await this.getFile(userId, fileId);

    if (this.s3) {
      try {
        const command = new this.GetObjectCommand({
          Bucket: this.bucket,
          Key: file.file_path
        });
        const response = await this.s3.send(command);
        const content = await response.Body.transformToString('utf-8');
        return { ...file, content };
      } catch (err) {
        console.warn('[S3] Download failed, using DB content:', err.message);
      }
    }

    return file;
  }

  _getMimeType(fileName) {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const types = {
      js: 'text/javascript',
      jsx: 'text/javascript',
      ts: 'text/typescript',
      tsx: 'text/typescript',
      py: 'text/x-python',
      html: 'text/html',
      htm: 'text/html',
      css: 'text/css',
      json: 'application/json',
      md: 'text/markdown',
      sh: 'text/x-shellscript',
      bash: 'text/x-shellscript',
      yaml: 'text/yaml',
      yml: 'text/yaml',
      xml: 'text/xml',
      sql: 'text/plain',
      txt: 'text/plain',
      csv: 'text/csv'
    };
    return types[ext] || 'text/plain';
  }
}

module.exports = new S3Service();
