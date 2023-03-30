import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { SkLearnAppStage } from "./sk-learn-app-stage";

export class SkLearnPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'sklearn-container-pipeline',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('ferroh-aws/sk-learn-container', 'main'),
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth'
        ]
      })
    });

    pipeline.addStage(new SkLearnAppStage(this, 'test'));
  }
}