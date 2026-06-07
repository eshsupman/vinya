export const ABR_CONFIG = {
  pollIntervalMs: 1000,
  rttThresholdMs: 250,
  plrThreshold: 0.05,
  degradeHoldMs: 500,
  recoverStepRatio: 0.05,
  recoverStepMs: 3000,
  recoverStableMs: 15000,
  highFps: 30,
  lowFps: 15,
  baseWidth: 1280,
  minBitrateFloor: 150000,
  alpha: { STABLE: 1.0, DEGRADING: 0.75, RECOVERING: 0.9 },
  resolutionLadder: [
    { w: 1280, h: 720, minBitrate: 1000000 },
    { w: 854, h: 480, minBitrate: 500000 },
    { w: 640, h: 360, minBitrate: 300000 },
    { w: 320, h: 240, minBitrate: 150000 },
  ],
};

const now = () =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export class AbrController {
  constructor(config = ABR_CONFIG) {
    this.cfg = config;
    this.state = 'STABLE';
    this.levelIndex = 0;
    this.fps = config.highFps;
    this.rMax = 0;
    this.degradeSince = null;
    this.recoverSince = 0;
    this.lastRecoverStep = 0;
  }

  isOverloaded(m) {
    return m.plr > this.cfg.plrThreshold || m.rttMs > this.cfg.rttThresholdMs;
  }

  update(m, t = now()) {
    const overloaded = this.isOverloaded(m);
    const cpuLimited = m.qualityLimitationReason === 'cpu';

    this.transition(overloaded, t);
    const bitrate = this.computeBitrate(m, cpuLimited);
    this.adaptResolutionAndFps(bitrate, t, cpuLimited);

    const level = this.cfg.resolutionLadder[this.levelIndex];
    return {
      state: this.state,
      level,
      fps: this.fps,
      bitrate,
      scaleResolutionDownBy: this.cfg.baseWidth / level.w,
      overloaded,
      cpuLimited,
    };
  }

  transition(overloaded, t) {
    switch (this.state) {
      case 'STABLE':
        if (overloaded) {
          if (this.degradeSince === null) this.degradeSince = t;
          if (t - this.degradeSince >= this.cfg.degradeHoldMs) {
            this.degradeSince = null;
            this.state = 'DEGRADING';
          }
        } else {
          this.degradeSince = null;
        }
        break;

      case 'DEGRADING':
        if (!overloaded) {
          this.state = 'RECOVERING';
          this.recoverSince = t;
          this.lastRecoverStep = t;
        }
        break;

      case 'RECOVERING':
        if (overloaded) {
          this.state = 'DEGRADING';
        } else if (t - this.recoverSince >= this.cfg.recoverStableMs) {
          this.state = 'STABLE';
        }
        break;
    }
  }

  computeBitrate(m, cpuLimited) {
    const alpha = this.cfg.alpha[this.state] ?? 1.0;
    const beta = Math.max(0.5, 1 - 5 * m.plr);
    const abw = m.availableOutgoingBitrate || 0;

    if (m.plr === 0 && abw > 0) this.rMax = Math.max(this.rMax, abw);
    if (this.rMax === 0) {
      this.rMax = abw > 0 ? abw : this.cfg.resolutionLadder[0].minBitrate * 2;
    }

    const ceiling = cpuLimited
      ? this.rMax
      : Math.min(abw > 0 ? abw : this.rMax, this.rMax);

    const target = ceiling * alpha * beta;
    return Math.max(this.cfg.minBitrateFloor, Math.round(target));
  }

  adaptResolutionAndFps(bitrate, t, cpuLimited) {
    const ladder = this.cfg.resolutionLadder;

    if (cpuLimited) {
      this.fps = this.cfg.lowFps;
      if (this.levelIndex < ladder.length - 1) this.levelIndex += 1;
      this.lastRecoverStep = t;
      return;
    }

    if (this.state === 'DEGRADING') {
      this.fps = this.cfg.lowFps;

      while (
        this.levelIndex < ladder.length - 1 &&
        bitrate < ladder[this.levelIndex].minBitrate
      ) {
        this.levelIndex += 1;
      }
      return;
    }

    if (t - this.lastRecoverStep >= this.cfg.recoverStepMs) {
      this.lastRecoverStep = t;
      if (this.fps < this.cfg.highFps) {
        this.fps = this.cfg.highFps;
      } else if (
        this.levelIndex > 0 &&
        bitrate > ladder[this.levelIndex - 1].minBitrate
      ) {
        this.levelIndex -= 1;
      }
    }
    if (this.state === 'STABLE' && this.levelIndex === 0) {
      this.fps = this.cfg.highFps;
    }
  }
}

export async function collectMetrics(pc) {
  const report = await pc.getStats();
  const m = {
    bytesSent: 0,
    framesEncoded: 0,
    qualityLimitationReason: 'none',
    rttMs: 0,
    plr: 0,
    availableOutgoingBitrate: 0,
    frameWidth: 0,
    frameHeight: 0,
    framesPerSecond: 0,
    freezeMs: 0,
    decodeFps: 0,
  };

  report.forEach((stat) => {
    if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
      m.bytesSent = stat.bytesSent || 0;
      m.framesEncoded = stat.framesEncoded || 0;
      m.qualityLimitationReason = stat.qualityLimitationReason || 'none';
      m.frameWidth = stat.frameWidth || 0;
      m.frameHeight = stat.frameHeight || 0;
      m.framesPerSecond = stat.framesPerSecond || 0;
    }
    if (stat.type === 'remote-inbound-rtp' && stat.kind === 'video') {
      m.rttMs = (stat.roundTripTime || 0) * 1000;
      m.plr = Math.max(0, stat.fractionLost || 0);
    }
    if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
      m.freezeMs = (stat.totalFreezesDuration || 0) * 1000;
      m.decodeFps = stat.framesPerSecond || 0;
    }
    if (stat.type === 'candidate-pair' && (stat.nominated || stat.selected)) {
      if (stat.availableOutgoingBitrate) {
        m.availableOutgoingBitrate = stat.availableOutgoingBitrate;
      }
    }
  });

  return m;
}

export async function applyEncodingParameters(sender, decision) {
  if (!sender) return;
  const params = sender.getParameters();
  if (!params.encodings || params.encodings.length === 0) {
    params.encodings = [{}];
  }
  params.encodings[0].maxBitrate = decision.bitrate;
  params.encodings[0].scaleResolutionDownBy = Math.max(
    1,
    decision.scaleResolutionDownBy
  );
  params.encodings[0].maxFramerate = decision.fps;

  try {
    await sender.setParameters(params);
  } catch (e) {
    console.warn('setParameters failed:', e);
  }
}
