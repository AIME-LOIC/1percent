/**
 * routes/courseRoutes.js
 *
 * PURPOSE:
 *   Course/lesson routes: catalog, detail, enroll, progress.
 *
 * ENDPOINTS:
 *   GET /roadmap
 *   GET /roadmap/:phaseId
 *   GET /roadmap/:phaseId/:trackId
 *   GET /courses
 *   GET /courses/enrollments
 *   GET /courses/progress/overall
 *   GET /courses/progress/:lessonId/quick-quiz
 *   POST /courses/progress/:lessonId/quick-quiz
 *   POST /courses/progress/:lessonId/complete
 *   POST /courses/:courseId/enroll
 *   GET /courses/:courseId/progress
 *   GET /courses/lessons/:lessonId/content
 *   GET /courses/:slug
 *   POST /courses/:courseId/certificate
 *
 * EXPORTS: router
 * DEPENDENCIES: express
 *
 * Data model: database_consolidated.sql · Architecture: technical_pitch.txt
 */

const { Router } = require('express');
const courseController = require('../controllers/courseController');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rateLimit');
const { sanitizeStrings } = require('../middlewares/validate');
const certificateController = require('../controllers/certificateController');

const router = Router();

// Public routes
router.get('/roadmap', (req, res, next) => courseController.getRoadmap(req, res, next));
router.get('/roadmap/:phaseId', (req, res, next) => courseController.getPhase(req, res, next));
router.get('/roadmap/:phaseId/:trackId', (req, res, next) => courseController.getTrack(req, res, next));

// Public — courses list (MUST be before /:slug to avoid route collision)
router.get('/courses', rateLimit, (req, res, next) => courseController.getCourses(req, res, next));
router.get('/courses/thumbnail', (req, res, next) => courseController.getCourseThumbnail(req, res, next));

// Protected courses routes — named routes BEFORE /:slug
router.get('/courses/enrollments', authenticate, (req, res, next) => courseController.getMyEnrollments(req, res, next));
router.get('/courses/progress/overall', authenticate, (req, res, next) => courseController.getOverallProgress(req, res, next));
// Lesson Quick Quiz (fast-track completion) — named routes BEFORE /:slug
router.get('/courses/progress/:lessonId/quick-quiz', authenticate, rateLimit, (req, res, next) => courseController.getQuickQuiz(req, res, next));
router.post('/courses/progress/:lessonId/quick-quiz', authenticate, rateLimit, sanitizeStrings(2000), (req, res, next) => courseController.submitQuickQuiz(req, res, next));
router.post('/courses/progress/:lessonId/complete', authenticate, (req, res, next) => courseController.completeLesson(req, res, next));
router.post('/courses/:courseId/enroll', authenticate, (req, res, next) => courseController.enroll(req, res, next));
router.get('/courses/:courseId/progress', authenticate, (req, res, next) => courseController.getCourseProgress(req, res, next));

// Lesson content on demand (BEFORE /:slug to avoid route collision).
// optionalAuth resolves the user when a token is present so the
// controller can enforce premium/free-preview access server-side.
router.get('/courses/lessons/:lessonId/content', rateLimit, optionalAuth, (req, res, next) => courseController.getLessonContent(req, res, next));

// Source-backed lesson explanations. Search is performed server-side to avoid browser CORS restrictions.
function decodeSearchHtml(value='') {
  return String(value).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}
function googleResultsFromHtml(html) {
  const blocks=html.split(/<div class="MjjYud"/i).slice(1),results=[];
  for(const block of blocks){
    const titleMatch=block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const linkMatch=block.match(/<a[^>]+href="(https?:\/\/[^"]+|\/url\?q=[^"&]+)[^"]*"[^>]*>[\s\S]*?<h3/i);
    const snippetMatch=block.match(/<div class="(?:VwiC3b|yXK7lf|IsZvec)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if(!titleMatch||!linkMatch)continue;let url=linkMatch[1];
    if(url.startsWith('/url?')){try{url=new URLSearchParams(url.slice(url.indexOf('?')+1)).get('q')||'';}catch{}}
    if(!/^https?:\/\//i.test(url)||/google\.(com|rw)\//i.test(url))continue;
    const title=decodeSearchHtml(titleMatch[1]),snippet=decodeSearchHtml(snippetMatch?.[1]||'');
    if(!title||results.some(r=>r.url===url))continue;results.push({title:title.slice(0,180),url,snippet:snippet.slice(0,500)});if(results.length>=6)break;
  }return results;
}
router.post('/courses/lessons/explain',rateLimit,optionalAuth,async(req,res)=>{
  const selectedText=typeof req.body?.selectedText==='string'?req.body.selectedText.trim().slice(0,1800):'';
  const question=typeof req.body?.question==='string'?req.body.question.trim().slice(0,500):'Explain simply and give a practical example.';
  const lessonTitle=typeof req.body?.lessonTitle==='string'?req.body.lessonTitle.trim().slice(0,180):'';
  const lessonContext=typeof req.body?.lessonContext==='string'?req.body.lessonContext.trim().slice(0,3500):'';
  if(!selectedText)return res.status(400).json({success:false,error:'Select a passage first.'});
  const query=[selectedText,lessonTitle,question,'explained examples'].filter(Boolean).join(' ').slice(0,500);
  try{
    const googleUrl='https://www.google.com/search?hl=en&num=8&q='+encodeURIComponent(query);
    const response=await fetch(googleUrl,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36','Accept':'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(9000)});
    if(!response.ok)throw new Error('Google search returned HTTP '+response.status);
    const page=await response.text();let sources=googleResultsFromHtml(page);
    if(!sources.length){
      // Google may return a consent/CAPTCHA page; use DuckDuckGo HTML as a secondary search source.
      const fallback=await fetch('https://html.duckduckgo.com/html/?q='+encodeURIComponent(query),{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'},signal:AbortSignal.timeout(7000)});
      if(fallback.ok){
        const markup=await fallback.text(),blocks=markup.split(/class="result results_links[^"]*"/i).slice(1);
        sources=blocks.slice(0,6).map(block=>{
          const title=block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i),snippet=block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
          let url=title?.[1]||'';try{const parsed=new URL(url);url=parsed.searchParams.get('uddg')||url;}catch{}
          return {title:decodeSearchHtml(title?.[2]||''),url,snippet:decodeSearchHtml(snippet?.[1]||'')};
        }).filter(s=>s.title&&/^https?:\/\//i.test(s.url));
      }
    }
    if(!sources.length)return res.status(502).json({success:false,error:'The search provider did not return readable results. Try Search web or retry shortly.'});
    const useful=sources.filter(s=>s.snippet);
    const explanation=['Selected passage: '+selectedText,lessonTitle?'Lesson context: '+lessonTitle+'.':'','','Explanation based on available search-result snippets:',...((useful.length?useful:sources).slice(0,4).map((s,i)=>(i+1)+'. '+s.title+(s.snippet?' — '+s.snippet:''))),'','Focus requested: '+question,lessonContext?'Compare these findings with your lesson notes: '+lessonContext.slice(0,850)+'…':'','','Accuracy note: this is a source-backed summary of search-result snippets, not a full reading of every linked page. Open the sources below to confirm details and resolve disagreements.'].filter(Boolean).join('\n');
    res.json({success:true,query,explanation,sources:sources.slice(0,6),provider:useful.length?'Google Search':'Web search fallback'});
  }catch(error){console.error('[lesson-explain] Search failed:',error.message);res.status(502).json({success:false,error:'Web research is temporarily unavailable. Use Search web to open Google results directly.'});}
});

// Public — course detail by slug (AFTER all named routes)
router.get('/courses/:slug', rateLimit, (req, res, next) => courseController.getCourse(req, res, next));

// Certificate
router.post('/courses/:courseId/certificate', authenticate, (req, res, next) => certificateController.issue(req, res, next));

module.exports = router;
