import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {

  calculateHealthScore(dummyPortfolio: any) {

    const diversification = 70;
    const risk = 60;
    const goals = 80;
    const liquidity = 50;
    const liability = 75;

    const score =
      0.25 * diversification +
      0.25 * risk +
      0.25 * goals +
      0.15 * liquidity +
      0.10 * liability;

    return {
      score: Math.round(score),
      status: this.getStatus(score),
      insights: [
        "Portfolio is moderately diversified",
        "Risk level is balanced",
        "Goal progress is satisfactory"
      ]
    };
  }

  getStatus(score: number) {
    if (score > 80) return "Excellent";
    if (score > 60) return "Good";
    if (score > 40) return "Average";
    return "Poor";
  }
}