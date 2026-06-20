import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FaceService implements OnModuleInit {
  private readonly logger = new Logger(FaceService.name);
  private modelsLoaded = false;
  private faceapi: any;
  private canvasLib: any;
  private readonly modelsPath = path.join(process.cwd(), 'face-models');

  async onModuleInit() {
    await this.loadModels();
  }

  private async loadModels() {
    if (!fs.existsSync(this.modelsPath)) {
      this.logger.warn(
        `Face models not found at ${this.modelsPath}. Run: node scripts/download-face-models.js`,
      );
      return;
    }
    try {
      // Use WASM backend — no native compilation required on Windows
      this.canvasLib = await import('canvas');
      this.faceapi = await import('@vladmandic/face-api/dist/face-api.node-wasm.js');

      // WASM backend must be fully initialized before any tf ops
      await this.faceapi.tf.ready();

      // Patch faceapi to use node-canvas
      const { Canvas, Image, ImageData } = this.canvasLib;
      this.faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

      await Promise.all([
        this.faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelsPath),
        this.faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsPath),
        this.faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsPath),
      ]);
      this.modelsLoaded = true;
      this.logger.log('Face recognition models loaded');
    } catch (err: any) {
      this.logger.error('Face model load failed — feature disabled', err?.message);
    }
  }

  get isReady(): boolean {
    return this.modelsLoaded;
  }

  async extractDescriptor(imageBuffer: Buffer): Promise<number[] | null> {
    if (!this.modelsLoaded) return null;
    try {
      const img = await this.canvasLib.loadImage(imageBuffer);
      const cvs = this.canvasLib.createCanvas(img.width, img.height);
      const ctx = cvs.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const detection = await this.faceapi
        .detectSingleFace(cvs)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) return null;
      return Array.from(detection.descriptor);
    } catch (err: any) {
      this.logger.error('extractDescriptor error', err?.message);
      return null;
    }
  }

  findClosestMatch(
    probe: number[],
    candidates: Array<{ id: string; descriptor: number[] }>,
    threshold = 0.5,
  ): { id: string; distance: number } | null {
    let best: { id: string; distance: number } | null = null;
    for (const c of candidates) {
      const dist = this.euclidean(probe, c.descriptor);
      if (dist < threshold && (!best || dist < best.distance)) {
        best = { id: c.id, distance: dist };
      }
    }
    return best;
  }

  private euclidean(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
  }
}
