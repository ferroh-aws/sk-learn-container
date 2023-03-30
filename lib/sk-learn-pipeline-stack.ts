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
        input: CodePipelineSource.connection('ferroh-aws/sk-learn-container', 'main', {
          connectionArn: 'arn:aws:codestar-connections:us-east-1:253323635394:connection/9e4f343a-756a-46f0-8045-feabd549e174'
        }),
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