# from the app root
mkdir -p node_modules
for f in .modules/*.tgz; do tar -zxf "$f" -C node_modules/; done
npm rebuild