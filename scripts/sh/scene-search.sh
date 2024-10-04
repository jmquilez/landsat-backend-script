curl -s -X 'POST' "https://m2m.cr.usgs.gov/api/api/json/stable/scene-search" -H "X-Auth-Token: eyJjaWQiOjI3Mjk2MjA2LCJzIjoiMTcyODA4MTc4MCIsInIiOjczOCwicCI6WyJ1c2VyIl19" -d '{
    "maxResults": 500,
    "datasetName": "gls_all",
    "sceneFilter": {
        "ingestFilter": null,
        "spatialFilter": null,
        "metadataFilter": null,
        "cloudCoverFilter": {
            "max": 100,
            "min": 0,
            "includeUnknown": true
        },
        "acquisitionFilter": null
    },
    "bulkListName": "my_bulk_list",
    "metadataType": "summary",
    "orderListName": "my_order_list",
    "startingNumber": 1,
    "compareListName": "my_comparison_list",
    "excludeListName": "my_exclusion_list"
}' | jq