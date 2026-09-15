/* ============================================================
   Expert Layer — shared lesson template
   ============================================================
   Every upgraded lesson gets this structure appended to its
   existing content_md. Sections are filled by each course's
   data file. All blocks carry their own leading/trailing
   newlines so parts can be joined with ''.
   ============================================================ */

function expertLayer(d) {
  const parts = [];

  parts.push(`\n\n---\n\n## 🎓 The Expert Layer`);

  parts.push(`\n\n### What Professionals Do Differently\n\n${d.expertsDoDifferently}`);

  parts.push(`\n\n### How Professionals Actually Work\n\n${d.howExpertsWork}`);

  if (d.toolsOfTheTrade && d.toolsOfTheTrade.length) {
    const rows = d.toolsOfTheTrade
      .map(t => `\n| ${t[0]} | ${t[1]} | ${t[2]} |`)
      .join('');
    parts.push(`\n\n### Tools of the Trade\n\n| Tool / Practice | What It Is | Why Experts Swear By It |\n|---|---|---|${rows}`);
  }

  if (d.insiderMoves && d.insiderMoves.length) {
    const items = d.insiderMoves.map((m, i) => `\n${i + 1}. ${m}`).join('');
    parts.push(`\n\n### Insider Moves You Won't Find in Tutorials\n${items}`);
  }

  if (d.fieldScenarios && d.fieldScenarios.length) {
    let block = `\n\n### Field Scenarios: How Experts Handle Real Situations\n`;
    for (const s of d.fieldScenarios) {
      block += `\n**${s.situation}**\n\n- *What a beginner does:* ${s.beginner}\n- *What an expert does:* ${s.expert}\n- *Why it matters:* ${s.why}\n`;
    }
    parts.push(block);
  }

  if (d.expertMistakes && d.expertMistakes.length) {
    parts.push(`\n\n### Expert Confessions: Mistakes Even Pros Make\n\n${d.expertMistakes.map(m => `- ${m}`).join('\n')}`);
  }

  if (d.dayInTheLife) {
    parts.push(`\n\n### A Day in the Life\n\n${d.dayInTheLife}`);
  }

  if (d.hiringLens) {
    parts.push(`\n\n### The Hiring Manager's Lens\n\n${d.hiringLens}`);
  }

  if (d.firstJobReality) {
    parts.push(`\n\n### Your First Job, In Reality\n\n${d.firstJobReality}`);
  }

  if (d.exercises && d.exercises.length) {
    const items = d.exercises.map((e, i) => `\n${i + 1}. ${e}`).join('');
    parts.push(`\n\n### Expert-Level Exercises\n${items}`);
  }

  if (d.goDeeper && d.goDeeper.length) {
    const items = d.goDeeper.map(g => `\n- ${g}`).join('');
    parts.push(`\n\n### Go Deeper\n${items}`);
  }

  parts.push(`\n\n---\n\n> **The 1% difference:** ${d.onePercent}`);

  return parts.join('');
}

module.exports = { expertLayer };
