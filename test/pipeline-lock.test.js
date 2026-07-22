import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  endPipeline,
  getActivePipelineOperation,
  isPipelineRunning,
  tryBeginPipeline,
} from "../dist/pipeline-lock.js";

afterEach(() => {
  endPipeline("dreaming");
  endPipeline("daily-report");
});

describe("shared dreaming/report lock", () => {
  it("prevents a daily report from overlapping a dreaming run", () => {
    assert.equal(tryBeginPipeline("dreaming"), true);
    assert.equal(getActivePipelineOperation(), "dreaming");
    assert.equal(tryBeginPipeline("daily-report"), false);
    assert.equal(isPipelineRunning(), true);
    endPipeline("dreaming");
    assert.equal(isPipelineRunning(), false);
  });

  it("does not let the wrong operation release the lock", () => {
    assert.equal(tryBeginPipeline("daily-report"), true);
    endPipeline("dreaming");
    assert.equal(getActivePipelineOperation(), "daily-report");
    endPipeline("daily-report");
    assert.equal(getActivePipelineOperation(), null);
  });
});
