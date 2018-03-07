import React, { Component } from 'react';
import styles from '../styles/widgetStyles';
import '../stylesheets/GatewayWidget.css';

class ContainerHeader extends Component {
    renderOtherOperations(){
        if(!this.props.otherOperations){ return null; }
        return <span>{this.props.otherOperations}</span>
    }

    render(){
        return (
            <div className="card-header d-flex align-items-center container-header">
                <h3 className="h4" style={styles.fullWidth}>{this.props.title}</h3>
                {this.props.otherOperations ? this.props.otherOperations : null}
                <div className="icon clickable">{this.props.refreshClicked ? <a onClick={(e) => {e.preventDefault(); this.props.refreshClicked()}}><i className="fa fa-refresh" /></a> : null}</div>
            </div>
        )
    }
}

export default ContainerHeader;