import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Repository, TagMutability } from 'aws-cdk-lib/aws-ecr';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, CodeStarConnectionsSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';

export class SkLearnContainerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const repository = new Repository(this, 'sklearn-repository', {
      imageScanOnPush: true,
      imageTagMutability: TagMutability.MUTABLE,
      repositoryName: 'sklearn-registry'
    });

    const imageBuild = new PipelineProject(this, 'SkLearnDockerBuild', {
      environment: {
        buildImage: LinuxBuildImage.fromCodeBuildImageId('aws/codebuild/standard:6.0'),
        privileged: true
      },
      buildSpec: BuildSpec.fromObject({
        'version': '0.2',
        'phases': {
          'install': {
            'runtime-versions': {
              'python': '3.10'
            }
          },
          'pre_build': {
            'commands': [
              'echo Logging in to Amazon ECR...',
              'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS ' +
              '--password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com'
            ]
          },
          'build': {
            'commands': [
              'pip install -r requirements.txt',
              'python setup.py bdist_wheel',
              'docker build -t $REPOSITORY_URI:latest .',
              'docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION'
            ]
          },
          'post_build': {
            'commands': [
              'docker push $REPOSITORY_URI:latest',
              'docker push $REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION',
              'export imageTag=$CODEBUILD_RESOLVED_SOURCE_VERSION',
              'printf \'[{"name":"app","imageUri":"%s"}]\' $REPOSITORY_URI:$imageTag > imagedefinitions.json'
            ]
          }
        },
        'env': {
          'exported-variables': ['imageTag']
        },
        'artifacts': {
          'files': 'imagedefinitions.json',
          'name': 'imagedefinitions'
        }
      }),
      environmentVariables: {
        'REPOSITORY_URI': {
          value: repository.repositoryUri
        },
        'AWS_ACCOUNT_ID': {
          value: cdk.Aws.ACCOUNT_ID
        }
      }
    });
    repository.grantPullPush(imageBuild);

    const sourceArtifact = new Artifact();

    const sourceAction = new CodeStarConnectionsSourceAction({
      actionName: 'DockerSources',
      branch: 'main',
      connectionArn: 'arn:aws:codestar-connections:us-east-1:253323635394:connection/9e4f343a-756a-46f0-8045-feabd549e174',
      output: sourceArtifact,
      owner: 'ferroh-aws',
      repo: 'sklearn-sagemaker'
    });
    const buildAction = new CodeBuildAction({
      actionName: 'buildContainer',
      executeBatchBuild: false,
      input: sourceArtifact,
      project: imageBuild
    });
    const dockerPipeline = new Pipeline(this, 'DockerImagePipeline', {
      stages: [
        {
          stageName: 'GetSource',
          actions: [sourceAction]
        },
        {
          stageName: 'BuildDockerImage',
          actions: [buildAction]
        }
      ]
    });
  }
}
