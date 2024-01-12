import {Construct} from 'constructs';
import {ApiObject, App, Chart, ChartProps, Size} from 'cdk8s';
import * as kplus from "cdk8s-plus-27";

// Define chart constants
const DOCKER_IMAGE = "113191093292.dkr.ecr.us-east-2.amazonaws.com/dynamodb-app:latest"
const TABLE_NAME = "urls";
const SERVICE_ACCOUNT_NAME = "eks-dynamodb-app-sa";

const appPort = 8080;
const lbPort = 9090;

const fieldExportNameForTable = "export-dynamodb-tablename";
const fieldExportNameForRegion = "export-dynamodb-region";
const configMapName = "export-dynamodb-urls-info";

const namespaceName = "hybrid";

export class ConfigChart extends Chart {
    public readonly cfgMap: kplus.ConfigMap;

    constructor(scope: Construct, id: string, props: ChartProps = {}) {
        super(scope, id, props);

        // Create a new Namespace, which will be used to run the application
        new kplus.Namespace(this, namespaceName, {
            metadata: {
                name: namespaceName
            }
        });

        // Create a new ConfigMap, which will be used to pass the DynamoDB table name and region to the application
        this.cfgMap = new kplus.ConfigMap(this, configMapName, {
            metadata: {
                name: configMapName,
                namespace: namespaceName
            }, data: {
                [fieldExportNameForTable]: TABLE_NAME, [fieldExportNameForRegion]: "us-east-2"
            }
        });

        new ApiObject(this, 'serviceaccount', {
            apiVersion: 'v1',
            kind: 'ServiceAccount',
            metadata: {
                name: SERVICE_ACCOUNT_NAME,
                namespace: namespaceName,
                annotations: {
                    "eks.amazonaws.com/role-arn": "arn:aws:iam::113191093292:role/DDBServiceRole"
                }
            },
            automountServiceAccountToken: true,
        })
    }
}

interface NewDeploymentChartProps extends ChartProps {
    cfgMap: kplus.ConfigMap;
}

export class NewDeploymentChart extends Chart {
    constructor(scope: Construct, id: string, props: NewDeploymentChartProps) {
        super(scope, id, props);

        const dep = new kplus.Deployment(this, 'platform-app-deployment-dynamodb', {
            metadata: {
                name: 'platform-app-deployment-dynamodb',
                namespace: namespaceName
            },
            replicas: 3,
            serviceAccount: kplus.ServiceAccount.fromServiceAccountName(this, 'aws-irsa', SERVICE_ACCOUNT_NAME, {
                namespaceName: namespaceName
            }),
            automountServiceAccountToken: true,
        });



        const containerOpts: kplus.ContainerProps = {
            image: DOCKER_IMAGE,
            imagePullPolicy: kplus.ImagePullPolicy.ALWAYS,
            name: 'platform-hybrid-container-dynamodb',
            ports: [{number: appPort}],
            resources: {
                cpu: {
                    request: kplus.Cpu.millis(250),
                    limit: kplus.Cpu.millis(1000),
                },
                memory: {
                    request: Size.mebibytes(128),
                    limit: Size.mebibytes(512),
                }
            },
            securityContext: {
                allowPrivilegeEscalation: true,
                readOnlyRootFilesystem: false,
                privileged: true,
                ensureNonRoot: false,
            },

        }
        const container = dep.addContainer(containerOpts);
        container.env.addVariable("TABLE_NAME", kplus.EnvValue.fromConfigMap(props.cfgMap, fieldExportNameForTable, {optional: false}));
        container.env.addVariable("AWS_REGION", kplus.EnvValue.fromConfigMap(props.cfgMap, fieldExportNameForRegion, {optional: false}));

        dep.exposeViaService({
            name: 'platform-hybrid-service-dynamodb',
            ports: [{port: lbPort, targetPort: appPort}],
            serviceType: kplus.ServiceType.LOAD_BALANCER,
        })
        return this;
    }
}

const app = new App();
const config = new ConfigChart(app, 'config-chart');
const deployment = new NewDeploymentChart(app, 'platform-app-chart', {cfgMap: config.cfgMap});
deployment.addDependency(config)
app.synth();
