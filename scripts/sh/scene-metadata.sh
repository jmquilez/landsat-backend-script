curl -s -X 'POST' "https://m2m.cr.usgs.gov/api/api/json/stable/scene-metadata" -H "X-Auth-Token: eyJjaWQiOjI3Mjk2MjA2LCJzIjoiMTcyODA4MTc4MCIsInIiOjczOCwicCI6WyJ1c2VyIl19" -d '{
    "datasetName": "landsat_ot_c2_l2",
    "entityId": "LC08_L2SP_012025_20201231_20210308_02_T1",
    "idType": "displayId",
    "metadataType": "full",
    "useCustomization": false
}' | jq