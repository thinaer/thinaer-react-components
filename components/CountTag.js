import React, { Component } from 'react';
import styles from '../styles/widgetStyles';
import '../stylesheets/GatewayWidget.css';

class CountTag extends Component {
    render(){
        return(
            <div className="text" style={styles.fullWidth}>
                <a href={'.'} onClick={(e) => {e.preventDefault(); this.props.onClick()}}>
                    <strong>
                        <span className={this.props.className} style={this.props.style}>
                            {this.props.count}
                            <div style={{display: 'inline'}} className="icon"><i style={this.props.style} className={this.props.icon} /></div>
                        </span>
                    </strong>
                    <br />
                    <small className={this.props.currentlySelected ? 'selected-count-tag' : null}>{this.props.label}</small>
                </a>
            </div>
        )
    }
}

export default CountTag;