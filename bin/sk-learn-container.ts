#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SkLearnPipelineStack } from "../lib/sk-learn-pipeline-stack";

const app = new cdk.App();
new SkLearnPipelineStack(app, 'SkLearnPipelineStack', {
  env: {
    account: '253323635394',
    region: 'us-east-1'
  }
});
app.synth();