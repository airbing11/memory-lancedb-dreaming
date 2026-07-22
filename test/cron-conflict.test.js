import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DREAMING_TRIGGER_TOKEN,
  MANAGED_DREAMING_CRON_NAME,
  MANAGED_DREAMING_CRON_TAG,
} from "../dist/constants.js";
import { isLegacyConflictCronJob } from "../dist/cron.js";

describe("isLegacyConflictCronJob", () => {
  it("flags dreaming-plugin-healthcheck", () => {
    assert.equal(
      isLegacyConflictCronJob({ id: "1", name: "dreaming-plugin-healthcheck" }),
      true
    );
  });

  it("does not flag managed dreaming cron", () => {
    assert.equal(
      isLegacyConflictCronJob({
        id: "2",
        name: MANAGED_DREAMING_CRON_NAME,
        description: MANAGED_DREAMING_CRON_TAG,
        payload: { kind: "systemEvent", text: DREAMING_TRIGGER_TOKEN },
      }),
      false
    );
  });

  it("flags dreaming + healthcheck in name", () => {
    assert.equal(
      isLegacyConflictCronJob({ id: "3", name: "dreaming-healthcheck-nightly" }),
      true
    );
  });

  it("flags renamed legacy jobs that still carry the dreaming trigger", () => {
    assert.equal(
      isLegacyConflictCronJob({
        id: "4",
        name: "custom old dream",
        payload: { kind: "systemEvent", text: DREAMING_TRIGGER_TOKEN },
      }),
      true
    );
  });
});
