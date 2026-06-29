# DEPRECATED: This manual deploy script is superseded by the osls-based
# GitHub Actions workflow at .github/workflows/deploy-staging.yml, which
# deploys via serverless.yml. Prefer running that workflow (workflow_dispatch)
# so the runtime and infrastructure stay codified. This script is kept only
# as a break-glass fallback.

functionName=test-sales-and-dev-leads

echo "checking AWS authentication..."
aws lambda --region us-east-1 list-functions | grep $functionName > /dev/null
if [ $? -ne 0 ]
then
  echo "error: you're not authenticated correctly with AWS(use 'aws_auth', per"
  echo "https://github.com/activeprospect/infrastructure-modules/blob/master/security/IAM_INSTRUCTIONS.md#switching-roles-bookmarks)"
  exit 1
fi

echo "creating function.zip..."
zip -r function.zip lib demoConfig/keys.json node_modules index.js package.json package-lock.json > /dev/null

echo "updating function at AWS..."
aws lambda --region us-east-1 update-function-code --function-name $functionName --zip-file fileb://function.zip

rm -fv function.zip
echo "done"
