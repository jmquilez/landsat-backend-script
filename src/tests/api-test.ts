import { API } from '../api/api';
import dotenv from 'dotenv';
import { prettyObj } from '../utils/utils';

dotenv.config();
const api = new API(process.env.LANDSAT_API_USERNAME!, process.env.LANDSAT_API_PASSWORD!);

const DATASETS = [
    "gls_all",
    // UNAVAILABLE DATASETS
    /*"landsat_tm_c1",
    "landsat_etm_c1",
    "landsat_8_c1",*/
    "landsat_tm_c2_l1",
    "landsat_tm_c2_l2",
    "landsat_etm_c2_l1",
    "landsat_etm_c2_l2",
    "landsat_ot_c2_l1",
    "landsat_ot_c2_l2",
    "sentinel_2a",
];

const main = async () => {
    await api.login(process.env.LANDSAT_API_USERNAME!, process.env.LANDSAT_API_PASSWORD!);
    //await api.login()
    // DATASETS 6, 5, 4 y 3 funcionan
    const scenes = await api.search(DATASETS[3], undefined, undefined, undefined, undefined, '2024-01-01', '2024-01-5', undefined, 500);
    console.log(prettyObj(scenes));
}

main().then(() => {
    console.log("DONE 🫡🫡");
});
