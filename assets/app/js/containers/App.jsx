import React, { Component, PropTypes } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import io from 'socket.io-client'
import { browserHistory } from 'react-router'
import * as Actions from '../actions/ReduxTaskActions'
import Header from '../components/Header.jsx'
import {matchesUrl, getCurrentProject, isItemPresent} from '../utils/general'
import {isProjectPresent} from '../utils/collection'
import LeftPanel from '../components/LeftPanel.jsx'
import { Grid, Row, Col } from 'react-bootstrap'
import Sidebar from 'react-sidebar'
import LoadingIndicator from '../components/LoadingIndicator.jsx'
import Snackbar from 'material-ui/lib/snackbar';
import {_updateAppStatus}  from '../actions/ReduxTaskActions'

var AppConstants = require('../AppConstants');

class App extends Component {
    constructor(props, context) {
        super(props, context)
        let host = 'ws://localhost:4001/'
        let socket = io.connect(host)
        this.state = { socket: socket }
        this.initApp()
        this.userIsOnline()
        this.monitorOnlineStatus()
        this.monitorProjectChanges()
        this.monitorNotifications()
        window.scrollback = {"room":"collab","form":"toast","minimize":true};(function(d,s,h,e){e=d.createElement(s);e.async=1;e.src=(location.protocol === "https:" ? "https:" : "http:") + "//scrollback.io/client.min.js";d.getElementsByTagName(s)[0].parentNode.appendChild(e);}(document,"script"));
    }

    initApp() {
        this.props.dispatch(Actions.initializeApp())
    }

    userIsOnline() {
        this.state.socket.emit('is_online', {user_id: localStorage.getItem('user_id')})
        this.props.dispatch(Actions.userOnline(localStorage.getItem('user_id')))
    }

    monitorOnlineStatus() {
        this.state.socket.on('teammate_online', (data) => {
            this.props.dispatch(Actions.userOnline(data.user_id));
        });        
        this.state.socket.on('teammate_offline', (data) => {
            this.props.dispatch(Actions.userOffline(data.user_id));
        });   
    }    

    monitorProjectChanges() {
        this.state.socket.on('new_task', (data) => {
            if (data.sender !== localStorage.getItem('user_id')) {
                this.props.dispatch(Actions._addTask(data.task));
            }
        });        
        this.state.socket.on('mark_done', (data) => {
            if (data.sender !== localStorage.getItem('user_id')) {
                this.props.dispatch(Actions._markDone(data.task_id));                
            }
        });     
        this.state.socket.on('delete_task', (data) => {
            if (data.sender !== localStorage.getItem('user_id')) {
                this.props.dispatch(Actions._deleteTask(data.task_id));                
            }
        });
        this.state.socket.on('new_milestone', (data) => {
            if (data.sender !== localStorage.getItem('user_id')) {
                this.props.dispatch(Actions._createMilestone(data.milestone));
            }
        });
        this.state.socket.on('delete_milestone', (data) => {
            if (data.sender !== localStorage.getItem('user_id')) {
                this.props.dispatch(Actions._deleteMilestone(data.milestone_id));
            }
        });

    }

    monitorNotifications() {
        this.state.socket.on('new_notification', (data) => {
            this.props.dispatch(Actions.addUsers([data.user]))
            this.props.dispatch(Actions.newNotification(data.notification))
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        const { projects } = this.props;
        if (matchesUrl(window.location.href, AppConstants.APP_ROOT_URL) && projects.length > 0) {
            // Redirect to default project (current set as project at index 0)
            let defaultProjectId = projects[0].id;
            browserHistory.push('/app/project/' + defaultProjectId);
            return false;         
        }
        return true;
    }

    handleSnackbarClose() {
        let dispatch = this.props.dispatch
        dispatch(_updateAppStatus({snackbar: {isOpen: false, message: ''}}))
    }

    render() {
        const {notifications, projects, users, dispatch, app, files, search} = this.props;
        const actions = bindActionCreators(Actions, dispatch);
        const currentProjectId = getCurrentProject()

        let basicUsers = [];
        let projectCreator = '';
        let currentProject = null

        if (users.length === 0) {
            // First initialization of app
            return (<div className='main-content'></div>);
        }

        let children = this.props.children;
        if (projects.length === 0 && matchesUrl(window.location.href, AppConstants.APP_ROOT_URL)) {
            if (!app.loading) {
                children = (
                    <div className='main-content'>
                        <div className="no-items">
                            <h3>You have no projects yet!</h3>
                            <p>Add one to get started</p>
                        </div>
                    </div>
                )
            } else {
                children = (
                    <div className='main-content'>
                        <LoadingIndicator/>
                    </div>
                )
            }
        }

        let displayName = users.filter(
            user => user.id === localStorage.getItem('user_id'))[0].display_name;

        let unreadCount = notifications.reduce((total, notif) => notif.read ? total : total+1, 0);

        if (isProjectPresent(projects, currentProjectId)) {
            currentProject = projects.filter(proj => proj.id === currentProjectId)[0];
            let basicUserIds = currentProject.basic;

            projectCreator = users.filter(user  => currentProject.creator === user.id)[0];
            basicUsers = users.filter(user => isItemPresent(basicUserIds, user.id));
        }
        let allActiveUsers = basicUsers
        if (projectCreator) allActiveUsers.push(projectCreator)

        return (
            <div>
                <Sidebar
                    sidebarClassName="left-panel"
                    sidebar={
                     <LeftPanel
                        currentProject={currentProject}
                        projects={projects}
                        app={app}
                        files={files}
                        actions={actions}
                        onCreateProject={actions.createProject}
                      />
                    }
                    open={true}
                    docked={true}>
                    <Header
                        unreadCount={unreadCount}
                        projects={projects}
                        displayName={displayName}
                        search={search}
                        actions={actions}
                    />
                    <div className="body-wrapper">
                        {children}
                    </div>
                </Sidebar>
                <Snackbar
                    open={app.snackbar.isOpen}
                    message={app.snackbar.message}
                    autoHideDuration={4000}
                    onRequestClose={this.handleSnackbarClose.bind(this)}
                />
            </div>
        );
    }
}



App.propTypes = {
    dispatch: PropTypes.func.isRequired,
    notifications: PropTypes.array.isRequired,
    projects: PropTypes.array.isRequired,
    users: PropTypes.array.isRequired,
    files: PropTypes.array.isRequired,
    app: PropTypes.object.isRequired,
    search: PropTypes.array.isRequired
};

function mapStateToProps(state) {
    return {
        notifications: state.notifications,
        projects: state.projects,
        users: state.users,
        files: state.files,
        app: state.app,
        search: state.search
    };
}

export default connect(mapStateToProps)(App)