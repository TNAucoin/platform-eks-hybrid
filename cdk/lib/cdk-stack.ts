import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";


export class DDBCdkStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const table = new dynamodb.TableV2(this, 'Table', {
            tableName: 'urls',
            partitionKey: {name: 'shortcode', type: dynamodb.AttributeType.STRING},
        });

        // Create an IAM role with a trust relationship to the EKS OIDC provider so that pods that use this role can assume an IAM role
        const ddbServiceRole = new iam.Role(this, 'DDBServiceRole', {
            roleName: 'DDBServiceRole',
            description: 'DDB Service Role for IRSA',
            assumedBy: new iam.FederatedPrincipal(
                process.env.EKS_OIDC_FED_ARN!,
                {
                    "StringEquals": {[`${process.env.EKS_OIDC_POLICY_KEY ? process.env.EKS_OIDC_POLICY_KEY : ''}:aud`]: "sts.amazonaws.com"},
                    "ForAnyValue:StringLike": {[`${process.env.EKS_OIDC_POLICY_KEY ? process.env.EKS_OIDC_POLICY_KEY : ''}:sub`]: "system:serviceaccount:hybrid:eks-dynamodb-app-sa"}
                },
                "sts:AssumeRoleWithWebIdentity"
            )
        });

        table.grantReadWriteData(ddbServiceRole);

    }
}
