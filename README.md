# Fantasy Card Art LoRAs

This repo hosts preparation scripts for making SDXL LoRAs of various types of fantasy creatures.

1. Install Python 3.11 and run `pip install poetry`
2. Clone this repo with `git clone --recursive https://github.com/ayan4m1/fantasy-card-art-loras.git`
3. Download [this ZIP](https://mtgjson.com/downloads/all-files/#allprintingscsvfiles) and put `cards.csv` in the `data/` directory.
4. Run the following:

```sh
corepack enable
yarn install
cd downloader
poetry env use /path/to/python3.11
poetry install --no-root
cd ..
node index.js
```

Right now instead of just running yarn install, you need to do the following manual node_modules edits:

1. Edit `upscaler` package.json to add an "import" key to the "exports" for "./node" pointing to ESM JS
2. Edit `@tensorflow/tfjs-node` package.json to add 9 to napi_versions
3. `NAPI_VERSION=9 npm rebuild @tensorflow/tfjs-node`

**NOTE**: Node 24 will give an error in tensorflow.js about isNullOrUndefined, use Node 22 instead for now.

<!--
Now the `lists/` directory will contain files you can feed into [this tool](https://github.com/Investigamer/mtg-art-downloader) to get source images. -->
