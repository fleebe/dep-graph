C:\Code\dep-graph 
       "NZGreens": "cd ../Spoke_NZGreens && node ../dep-graph/src/dep-graph.js -o ../dep-graph/out/NZGreens -g -j ./src/server/models",
    "graph" : "cd ../Spoke_NZGreens && node ../dep-graph/src/dep-graph.js -o ../dep-graph/out/NZGreens -g ./src/server/models"
  "NZGreens": "cd ../Spoke_NZGreens && node ../dep-graph/src/dep-graph.js -o ../dep-graph/out/NZGreens -g -j ./src/server"
C:\Code   
   node ./dep-graph/index.js -o ./dep-graph/out/NZGreens -g -j ./Spoke_NZGreens/src/server/models/index.js
   dep-graph -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/server
   dep-graph -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/api
   dep-graph -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/client
   dep-graph -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/components  -- err forms/index.js
dep-graph -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/extensions  --err react-components.js

dep-graph -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/extensions/texter-sideboxes/texter-feedback/react-component.js
node ./dep-graph/index.js  -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/extensions/texter-sideboxes/texter-feedback/react-component.js

node ./dep-graph/index.js -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/api
node ./dep-graph/index.js -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/client
node ./dep-graph/index.js -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/components

"uses require() as import and module.export which dep-graph ignores."
 node ./dep-graph/index.js -o ./dep-graph/out/eleventy -j ./eleventy/src

"contains index.js which has the export depending on imports"
node ./dep-graph/index.js -o ./dep-graph/out/NZGreens_Spoke_docs -j ./Spoke_NZGreens/src/components/forms

"./components/forms/GSForm.jsx contains a Call Expression"
node ./dep-graph/index.js -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/extensions

node ./dep-graph/index.js -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/components/AdminCampaignList

"test a smallish sub directory"
node ./dep-graph/index.js -o ./dep-graph/out/NZGreens_Spoke_docs -j ./Spoke_NZGreens/src/containers/Settings

"jsx"
node ./dep-graph/index.js -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/components/IncomingMessageList/ConversationPreviewModal.jsx

"contains typescript definitions"
node ./dep-graph/index.js -o ./dep-graph/out/NZGreens_Spoke_docs -g -j ./Spoke_NZGreens/src/lib/dst-helper.js

components
 {
    "file": "./Spoke_NZGreens/src/components/forms/index.js",
    "err": {
      "pos": 7,
      "loc": {
        "line": 1,
        "column": 7
      },
      "raisedAt": 18
    },
    "msg": "Unexpected token (1:7)",
    "src": "C:\\Code\\dep-graph\\src\\ast.js"