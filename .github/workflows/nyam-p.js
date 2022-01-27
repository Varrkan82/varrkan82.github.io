name: Update on schedule
# on: workflow_dispatch
on:
  schedule:
    # * is a special character in YAML so you have to quote this string
    - cron:  '35 */1 * * *'
jobs:
  resources:
    name: Update resources
    runs-on: ubuntu-latest
    steps:
      - name: Fetch Nyam resources
        run: wget http://llpp.xyz/ur/sisi.js -O nyam-p.js

      - name: Update Nyam resources
        uses: test-room-7/action-update-file@v1
        with:
            file-path: nyam-p.js
            commit-msg: Update resources
            github-token: ${{ secrets.GITHUB_TOKEN }}
