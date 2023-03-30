import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SkLearnContainerStack } from './sk-learn-container-stack';

export class SkLearnAppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const containerStack = new SkLearnContainerStack(this, 'SkLearnContainerStack');
  }
}