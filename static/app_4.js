//--- polyfill for IE --------------------------------------------------


// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.io/#x15.4.4.18
if (!Array.prototype.forEach) {

  Array.prototype.forEach = function(callback/*, thisArg*/) {

    var T, k;
    if (this === null) {
      throw new TypeError('this is null or not defined');
    }
    var O = Object(this);
    var len = O.length >>> 0;
    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function');
    }
    if (arguments.length > 1) {
      T = arguments[1];
    }
    k = 0;
    while (k < len) {
      var kValue;
      if (k in O) {
        kValue = O[k];
        callback.call(T, kValue, k, O);
      }
      k++;
    }
  };
}
//--- end polyfill --------------------------------------------------


function executeDeploymentJob(project, stage, applications, user) {
	return new Promise(
		    function (resolve, reject) {
		    	var job = {
		    		project: project,
		    		stage: stage,
		    		images: [],
		    		user: user
		    	};

		    	applications.forEach(function(application) {
					job.images.push({
				    		project: project,
				    		name: application.name,
				    		tag: application.version
							})
		    	});
		    	
		    	axios.post('/images/job', job)
		    	.then(resolve)
		    	.catch(reject);
		    }
		)
}

function ApplicationImageVisitor() {

	this.collectedApplications = {};
}

ApplicationImageVisitor.prototype.visit = function(image) {
	if (!this.collectedApplications[image.name]) {
		this.collectedApplications[image.name] = {
				name: image.name,
				versions: []
		}
	}
	var application = this.collectedApplications[image.name];
	application.versions.push(image.tag);
};

ApplicationImageVisitor.prototype.getCollectedApplications = function() {
	return Object.values(this.collectedApplications);
}

populateApps = function(project) {
	console.log("fetching apps");
	const that = this;
	var toast = pushInfo("Fetching Apps");
	var visitor = new ApplicationImageVisitor();
	axios.get('/apps?project=' + project)
	.then(function (response) {
		app.allApps = [];
		response.data.forEach(function(appl) {
			app.allApps.push(appl);
		});
		toast.text("Apps fetched").goAway(2000);
	})
	.catch(function (error) {
		console.log(error);
		toast.goAway(0);
		pushError("Could not fetch Apps", error.response.data.message);
	});
}

populateApplications = function(project) {
	console.log("fetching applications");
	var toast = pushInfo("Fetching Applications");
	var visitor = new ApplicationImageVisitor();
	axios.get('/images?project=' + project)
	.then(function (response) {
		response.data.forEach(function(image) {visitor.visit(image)});
		app.allApplications = visitor.getCollectedApplications();
		toast.text("Applications fetched").goAway(2000);

	})
	.catch(function (error) {
		console.log(error);
		toast.goAway(0);
		pushError("Could not fetch Applications", error.response.data.message);
	});
}

populateStages = function(project) {
	console.log("fetching stages");
	var toast = pushInfo("Fetching Stages");
	axios.get('/stages?project=' + project)
	.then(function (response) {
		response.data.forEach(function(stage) {app.stages.push(stage)});
		toast.text("Stages fetched").goAway(2000);
	})
	.catch(function (error) {
		toast.goAway(0);
		pushError("Could not fetch Stages", error.response.data.message);
	});
}

initApp = function(project) {
	populateStages(project);
	populateApplications(project);
}

pushSuccess = function(msg) {
	var toast = app.$toasted.success(msg)
	toast.goAway(1500);
}

pushInfo = function(msg) {
	return app.$toasted.info(msg, {action : {
		text : 'Close',
		onClick : function(e, toastObject) {
			toastObject.goAway(0);
		}
	}});
}

pushError = function(msg, detail) {
	return app.$toasted.error(msg + ': ' + detail, {action : {
		text : 'Close',
		onClick : function(e, toastObject) {
			toastObject.goAway(0);
		}
	}});
}

pushSuccess = function(msg) {
	return app.$toasted.success(msg, {action : {
		text : 'Close',
		onClick : function(e, toastObject) {
			toastObject.goAway(0);
		}
	}});
}

Vue.use(Toasted);

Vue.filter('formatDate', function(value) {
	if (value) {
		var date = new Date(value);
		return date.toLocaleString();
	}
});

var app = new Vue({
	el: '#wrap',
	data: {
		job: [],
		
		jobHistory: [],

		selectedApplication: null,

		selectedVersion: null,

		selectedStage: null,

		//selectedProject: window.location.href.split('?')[1] ? window.location.href.split('?')[1].split('=')[1] : null,
		selectedProject: null,

		allApplications: [],

		allApps: [],

		stages: [],

		projects: ["cee-project", "acs-project", "gr-project", "az-africa", "midcorp"],
		
		user: null,

		tab: window.location.hash ? window.location.hash.substring(1).split("/")[0] : "jobs"
	},
	
	mounted: function () {
		jQuery('#wrap').removeAttr('style');
		this.selectedProject = window.location.hash.substring(1).split("/")[1];
		if (this.selectedProject) {
		  this.$nextTick(function () {
			    // Code that will run only after the
			    // entire view has been rendered
			  		populateApps(this.selectedProject);
			  })
		}
	},

	computed: {
		versions: function() {
			if (this.selectedApplication) {
				return this.selectedApplication.versions.filter(v => parseInt(v[0]));
			} else return null;
		},

		applications: function() {
			return this.allApplications.filter((n) => this.job.filter(x => { return x.name === n.name }).length === 0);
		}
	},

	methods: {
		tabClicked: function(tab) {
			this.tab = tab;
//			if (this.selectedProject && this.selectedProject != null) {
//				window.location.hash = window.location.hash.split("/")[0] + '/' + this.selectedProject;
//			}
		},
		
		reset: function() {
			this.job = [];
			this.selectedApplication = null;
			this.selectedStage = null;
			this.allApplications = [];
			this.stages = [];
		},
		
		resetJob: function() {
			this.job = [];
		},

		onApplicationSelected: function () {
			this.versions = this.versions;
		},

		addSelectedApplicationToJob: function () {
			this.job.push({
				name: this.selectedApplication.name,
				version: this.selectedVersion
			});
			this.resetSelection();
		},

		removeApplicationFromJob: function(app) {
			var index = this.job.indexOf(app);
			if (index > -1) {
				this.job.splice(index, 1);
			}
		},

		resetSelection: function() {
			this.selectedApplication = null;
			this.selectedVersion = null;
		},

		reloadApp: function(boxId, appName) {
			var toast = pushInfo("Requesting Redeployment");
			return new Promise(
				    function (resolve, reject) {
				    	axios.post('/apps/' + boxId + '/redeployment/' + appName)
				    	.then(resolve)
				    	.catch(reject);
				    }
				).then(function(response) {
					console.log(response);
					toast.goAway(800);
					pushSuccess("Successfully Requested Redeployment at " + new Date().toUTCString() + ". Please give the application a few minutes until it is redeployed and started.");
				}).catch(function(error) {
					toast.goAway(800);
					pushError("Redeployment failed", error.response.data.message);
				});
		},

		executeJob: function() {
			var toast = pushInfo("Executing Job");
			var history = this.jobHistory;
			executeDeploymentJob(this.selectedProject, this.selectedStage, this.job, this.user)
				.then(function(response) {
					console.log(response);
					history.push(response.data);
					toast.goAway(800);
					pushSuccess("Deployment Job executed.").goAway(2000);
				}).catch(function(error) {
					toast.goAway(800);
					pushError("Deployment failed", error.response.data.message);
				});

		},

		callme: function(evt) {
			evt.currentTarget.href='#deployments/' + this.selectedProject;
			window.location.reload();
		},
		loadProject: function() {
			if (this.selectedProject) {
				this.reset();
				if (this.user) {
					initApp(this.selectedProject);
				}
				populateApps(this.selectedProject);
			}
//			if (this.selectedProject && this.selectedProject != null) {
//				window.location.hash = window.location.hash.split("/")[0] + '/' + this.selectedProject;
//			}
		}
	},

	updated: function() {
		$('.selectpicker').selectpicker('refresh');
	}

})



