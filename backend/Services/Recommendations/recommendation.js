
/**
 * This file implements the job recommendation logic for the platform.
 * It compares a student’s skills with job requirements using weighted matching,
 * filters out jobs with missing mandatory skills, and returns a ranked list
 * of recommended jobs based on a minimum match threshold.
 */

const THRESHOLD = 0.6;
const synonymMap = {
  "js": "javascript",
  "node": "node.js",
  "reactjs": "react"
};

function normalizeSkill(skill) {
  let s = skill.toLowerCase().trim();
  if (synonymMap[s]) return synonymMap[s];
  return s;
}

/*Recommendation Logic */

export function recommendJobs(applicantSkills, jobs) {
  // Normalize applicant skills into a map: skill to weight
  const applicantMap = new Map();
  for (let skill of applicantSkills) {
    const name = normalizeSkill(skill.name);
    applicantMap.set(name, skill.weight ?? 1);
  }

  const recommendations = [];

  for (let job of jobs) {
    // Normalize job skills into a map
    const jobMap = new Map();
    for (let skill of job.skills) {
      const name = normalizeSkill(skill.name);
      jobMap.set(name, {
        weight: skill.weight ?? 1,
        mandatory: skill.mandatory ?? false
      });
    }

    /* Step 1: Mandatory Skill Gate*/
    let missingMandatory = false;
    for (let [skill, info] of jobMap) {
      if (info.mandatory && !applicantMap.has(skill)) {
        missingMandatory = true;
        break;
      }
    }

    if (missingMandatory) {
      continue; // score = 0 → not recommended
    }

    /*Step 2: Weighted Match Score */
    let numerator = 0;
    let denominator = 0;

    for (let [skill, info] of jobMap) {
      denominator += info.weight;
      if (applicantMap.has(skill)) {
        numerator += applicantMap.get(skill) * info.weight;
      }
    }

    if (denominator === 0) continue;

    const matchScore = numerator / denominator;

    /* Step 3: Threshold */
    if (matchScore >= THRESHOLD) {
      recommendations.push({
        jobId: job.id,
        score: Number(matchScore.toFixed(2))
      });
    }
  }

  /*Step 4: Sort by best match */
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations;
}
