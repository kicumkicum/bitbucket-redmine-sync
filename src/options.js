goog.provide('options');
goog.require('api.Bitbucket');
goog.require('api.Redmine');


/**
 * @return {{sync: string, redmineHost: string, redmineApiKey: string, token: string}}
 */
function readSettings() {
	return {
		sync: document.getElementById('settings').value,
		redmineHost: document.getElementById('settings_redmine_host').value,
		redmineApiKey: document.getElementById('settings_redmine_api_key').value,
		token: document.getElementById('settings_token').value,
		bitbucketOwner: document.getElementById('settings_bitbucket_owner').value
	};
}


/**
 * @param {{
 *      sync: string,
 *      redmineHost: string,
 *      redmineApiKey: string,
 *      token: string
 * }} settings
 * @return {Promise}
 */
function saveOptions(settings) {
	return new Promise(function(resolve, reject) {
		chrome.storage.sync.set({
			'settings': settings
		}, function() {
			// Update status to let user know options were saved.
			var status = document.getElementById('status');
			status.textContent = 'Options saved.';

			resolve();
		});
	});
}


/**
 * @return {Promise}
 */
function restoreOptions() {
	return new Promise(function(resolve, reject) {
		chrome.storage.sync.get(null, function(items) {
			document.getElementById('settings').value = items.settings.sync || '';
			document.getElementById('settings_token').value = items.settings.token || '';
			document.getElementById('settings_redmine_host').value = items.settings.redmineHost || '';
			document.getElementById('settings_redmine_api_key').value = items.settings.redmineApiKey || '';
			document.getElementById('settings_bitbucket_owner').value = 'interfaced';

			resolve();
		});
	});
}

document.addEventListener('DOMContentLoaded', function() {
	restoreOptions().then(function() {
		var _api = {
			bitbucket: new api.Bitbucket,
			redmine: new api.Redmine
		};

		Promise.all([
				_api.redmine.getProjects(),
				_api.bitbucket.getRepositories(document.getElementById('settings_bitbucket_owner').value)
			])
			.then(function(response) {
				var redmineProjects = response[0].projects;
				var bitbucketRepo = response[1];

				var sort = function(a, b) {
					return a.name.localeCompare(b.name);
				};
				redmineProjects.sort(sort).forEach(function(project) {
					var option = document.createElement('option');
					option.setAttribute('value', project.identifier);
					option.innerText = project.name;
					document.getElementById('redmine-projects').appendChild(option);
				});

				bitbucketRepo.sort(sort).forEach(function(repo) {
					var option = document.createElement('option');
					option.setAttribute('value', repo.name);
					option.innerText = repo.name;
					document.getElementById('bitbucket-repo').appendChild(option);
				});

			});
	});
});
document.getElementById('save').addEventListener('click', function() {
	saveOptions(readSettings());
});
document.getElementById('link-button').addEventListener('click', function() {
	var redmineProject = document.getElementById('redmine-projects').value;
	var bitbucketRepo = document.getElementById('bitbucket-repo').value;

	var settings = readSettings();
	var sync = settings.sync;

	try {
		sync = JSON.parse(sync);
	} catch (e) {
		sync = {};
	}

	var bitbucketOwner = settings.bitbucketOwner;
	sync[bitbucketOwner] = sync[bitbucketOwner] || {};
	sync[bitbucketOwner][redmineProject] = bitbucketRepo;
	settings.sync = JSON.stringify(sync);

	saveOptions(settings).then(restoreOptions);
});
