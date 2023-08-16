pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                script {
                    checkout scm
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                script {
                    snykSecurity(
                        severity: 'high',
                        snykInstallation: 'latest',
                        snykTokenId: 'platform_hammerhead_testing_', // use env.SNYK_TOKEN
                        failOnIssues: false,
                        additionalArguments: '--all-projects --detection-depth=1 --debug'
                    )
                }
            }
        }
    }
}
