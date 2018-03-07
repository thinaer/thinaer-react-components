import _ from 'lodash';

const fromResponse = (er) => {
    if(er.statusCode === 400){
        return {status: er.statusCode, message: er.error.error};
    } else if(er && er.error && er.error.error && er.error.error.errors && er.error.error.errors[0] && er.error.error.errors[0].message) {
        return {status: er.statusCode, message: er.error.error.errors[0].message};
    } else if(er && _.isString(er.error)){
        return {status: er.statusCode, message: er.error};
    } else {
        console.log('er', er);
        return {status: er.statusCode, message: "Something went wrong"};
    }
};

export default {
    fromResponse
}
