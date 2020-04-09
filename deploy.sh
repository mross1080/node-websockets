git add .
timestamp=$(date +%d-%m-%Y_%H-%M-%S)
echo "New Build at ${timestamp}" 
git commit -m "New Build at ${timestamp}"
git push heroku master
