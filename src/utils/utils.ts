import util from 'util';

const prettyObj = (obj: any): any => {
    return util.inspect(obj, { depth: null, colors: true });
}

export {
    prettyObj
};
