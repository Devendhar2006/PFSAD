import Sentiment from "sentiment";

const sentiment = new Sentiment();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalize(value, min, max) {
  return clamp((value - min) / (max - min), 0, 1);
}

export function predictEngagement({ attendance, marks, behaviorRating, feedbackText }) {
  const normAttendance = normalize(attendance, 0, 100);
  const normMarks = normalize(marks, 0, 100);
  const normBehavior = normalize(behaviorRating, 1, 5);

  const sentimentScoreRaw = sentiment.analyze(feedbackText || "").comparative;
  const sentimentNorm = clamp((sentimentScoreRaw + 1) / 2, 0, 1);

  const riskScore = clamp(
    (1 - normAttendance) * 0.38 +
      (1 - normMarks) * 0.27 +
      (1 - normBehavior) * 0.2 +
      (1 - sentimentNorm) * 0.15,
    0,
    1
  );

  let engagementStatus = "Engaged";
  let riskLevel = "Low";

  if (riskScore >= 0.75) {
    engagementStatus = "Disengaged";
    riskLevel = "High";
  } else if (riskScore >= 0.45) {
    engagementStatus = "At Risk";
    riskLevel = "Medium";
  }

  const reasons = [];
  if (attendance < 70) reasons.push("low attendance");
  if (marks < 60) reasons.push("lower marks trend");
  if (behaviorRating < 3) reasons.push("behavior rating below expected");
  if (sentimentNorm < 0.45) reasons.push("negative sentiment in feedback");

  const explanation =
    reasons.length > 0
      ? `${reasons.join(" + ")} detected`
      : "overall academic and behavioral signals look healthy";

  const tips = [];
  if (attendance < 75) tips.push("Improve attendance consistency this month");
  if (marks < 65) tips.push("Schedule weekly revision and doubt-clearing sessions");
  if (behaviorRating < 3) tips.push("Engage actively in class activities");
  if (sentimentNorm < 0.5) tips.push("Speak with mentor or counselor for support");
  if (tips.length === 0) tips.push("Keep up the strong learning momentum");

  return {
    engagement_status: engagementStatus,
    confidence_score: Number(riskScore.toFixed(3)),
    explanation,
    risk_level: riskLevel,
    suggestions: tips
  };
}
