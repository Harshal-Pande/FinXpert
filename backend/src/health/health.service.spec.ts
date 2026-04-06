import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {

  calculateHealthScore(portfolio: any) {

    const diversification = this.getDiversificationScore(portfolio);
    const risk = this.getRiskScore(portfolio);
    const goals = this.getGoalScore(portfolio);
    const liquidity = this.getLiquidityScore(portfolio);
    const liability = this.getLiabilityScore(portfolio);

    const score =
      0.25 * diversification +
      0.25 * risk +
      0.25 * goals +
      0.15 * liquidity +
      0.10 * liability;

    return {
      score: Math.round(score),
      status: this.getStatus(score)
    };
  }

  getStatus(score: number) {
    if (score > 80) return "Excellent";
    if (score > 60) return "Good";
    if (score > 40) return "Average";
    return "Poor";
  }

  getDiversificationScore(portfolio: any) {
    return 70; // replace with logic
  }

  getRiskScore(portfolio: any) {
    return 60;
  }

  getGoalScore(portfolio: any) {
    return 80;
  }

  getLiquidityScore(portfolio: any) {
    return 50;
  }

  getLiabilityScore(portfolio: any) {
    return 75;
  }
}