import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Repository, TagMutability } from 'aws-cdk-lib/aws-ecr';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';

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
          'build': {
            'commands': [
              '$(aws ecr get-login --region $AWS_DEFAULT_REGION --no-include-email)',
              'cd sk-learn',
              'pip install -r requirements.txt',
              'python setup.py bdist_wheel',
              'docker build -t $REPOSITORY_URI:latest .',
              'docker tag $REPOSITORY_URI:latest $REPOSITORY_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION'
            ]
          },
          'post-build': {
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
        }
      }
    });
    repository.grantPullPush(imageBuild);
  }
}
