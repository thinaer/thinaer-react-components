import React, { Component } from 'react';

const levelFor = (level) => {
    switch(level){
        case 0: return 'alert alert-info';
        case 1: return 'alert alert-warning';
        case 2: return 'alert alert-danger';
        case 3: return 'alert alert-success';
        default: return 'alert';
    }
};

const alertMessageFor = (level) => {
    switch(level){
        case 0: return 'Info';
        case 1: return 'Warning!';
        case 2: return 'Error!';
        case 3: return 'Success!';
        default: return 'Alert';
    }
};

class Alert extends Component {
    render(){
        return(
            <div className={levelFor(this.props.level)}>
                <a href="#" className="close" data-dismiss="alert">&times;</a>
                <strong>{alertMessageFor(this.props.level)}</strong> {this.props.message}
            </div>
        );
    }
}

export default Alert;