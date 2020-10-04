echo "Enter Commit Message"
read Message
if ["$Message" = ""]
then 
Message="Auto Commit"
fi
git add -A
git commit -m "$Message"
git push
