#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { DDBCdkStack } from '../lib/cdk-stack';
dotenv.config();
const app = new cdk.App();

cdk.Tags.of(app).add('Name', 'platform-eks-hybrid')
cdk.Tags.of(app).add('Application', 'platform-eks-hybrid')
cdk.Tags.of(app).add('Environment', 'Dev')
cdk.Tags.of(app).add('Team', 'Platform')

new DDBCdkStack(app, 'CdkStack', {

  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: process.env.AWS_REGION,
  },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});