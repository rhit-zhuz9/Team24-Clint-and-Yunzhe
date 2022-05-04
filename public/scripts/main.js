/**
 * @fileoverview
 * Provides the JavaScript interactions for all pages.
 *
 * @author 
 * Clint Zhu and Yunzhe Wei
 */

/** namespace. */
var rhit = rhit || {};

rhit.FB_COLLECTION_CULTFILMS = "CultFilms";
rhit.FB_KEY_TITLE = "title";
rhit.FB_KEY_WATCHLIST = "watchlist";
rhit.fbFilmsManger = null;
rhit.fbAuthManager = null;


function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

rhit.ListPageController = class {
	constructor() {

		document.querySelector("#menuShowAllMovies").onclick = (event) => {
			window.location.href = "/list.html";
		}

		document.querySelector("#menuShowWatchlist").onclick = (event) =>{
			window.location.href = `/list.html?uid=${rhit.fbAuthManager.uid}`;
		}

		document.querySelector("#menuSignOut").onclick = (event) => {
			rhit.fbAuthManager.signOut();
		}

		

		rhit.fbFilmsManger.beginListening(this.updateList.bind(this))


		
	}

	async updateList() {
		const newList = htmlToElement('<div id="moviesContainer" class="rows justify-content-center"></div>');
		for (let i = 0; i < rhit.fbFilmsManger.length; i++) {
			const movie = rhit.fbFilmsManger.getFilmAtIndex(i);
			const newCard = await this._createdCard(movie);
			newCard.onclick = (event) => {

				//window.location.href = `/singlePic.html?id=${pic.id}`;
			};
			newList.appendChild(newCard);
		}

		const oldList = document.querySelector("#moviesContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
		const buttons = document.querySelectorAll(".addButton");
		buttons.forEach((button) => {
			button.onclick = async (event) => {
				const movieId = button.dataset.movieId;
				// rhit.fbFilmsManger.inWatchList(movieId).then((result) => {
				// 	console.log(result);
				// });
				// const newList = await rhit.fbFilmsManger.getWatchlist(movieId);
				// if(newList.includes(rhit.fbAuthManager.uid)){
				// 	console.log("true");
				// }

				firebase.firestore().collection(rhit.FB_COLLECTION_CULTFILMS).doc(movieId).get().then((doc) => {
					const list = doc.data()[rhit.FB_KEY_WATCHLIST];
					if(!list.includes(rhit.fbAuthManager.uid)){
						rhit.fbFilmsManger.addToWatchList(movieId);
					}
				});
				
			}
		});
	
	}

	async getUrl(title) {

		const response = await fetch(`//www.omdbapi.com/?apikey=5cb55cbf&t=${title}`);
		const data = await response.json();
		//console.log('Response data:', data);
		if (data["Response"] == "True" && data["Poster"].length > 5) {
       		return data["Poster"];

		} else {
			console.log("Missing poster data.  Do nothing.");
		}
		return null;
	}

	async _createdCard(Movie) {

		const url = await this.getUrl(Movie.title);
		
		return htmlToElement(`<div class="pin col-3" id="${Movie.id}">
        <img src = "${url}" alt="${Movie.title}">
		<p class="name">${Movie.title}</p>
		<button type="button" class="btn addButton" data-movie-id = "${Movie.id}">Add</button>
      </div>`);
	}
}

rhit.Movie = class {
	constructor(id, title) {
		this.id = id;
		this.title = title;
	}
}

rhit.FbFilmsManger = class {
	constructor(uid) {
		console.log("created movie manager");
		this._uid = uid;
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_CULTFILMS);
		this._unsubscribe = null;
	}
	beginListening(changeListener) {
		let query = this._ref.limit(40);
		if(this._uid){
			query = query.where(rhit.FB_KEY_WATCHLIST, "array-contains", this._uid);
		}
		this._unsubscribe = query.onSnapshot((querySnapshot) => {
			this._documentSnapshots = querySnapshot.docs;
			// querySnapshot.forEach((doc) => {
			// 	console.log(doc.data());\\\\
			// });
			changeListener();
		});
	}
	stopListening() {
		this._unsubscribe();
	}
	// update(id, quote, movie) {    }
	// delete(id) { }
	get length() {
		return this._documentSnapshots.length;
	}

	getFilmAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		if(docSnapshot.get("watchlist") == null){
			this._ref.doc(docSnapshot.id).update({
				[rhit.FB_KEY_WATCHLIST]: [] 
			});
		}
		const movie = new rhit.Movie(
			docSnapshot.id,
			docSnapshot.get(rhit.FB_KEY_TITLE)
		);
		return movie;
	}

	addToWatchList(movieId){
		this._ref.doc(movieId).update({
			[rhit.FB_KEY_WATCHLIST]: firebase.firestore.FieldValue.arrayUnion(rhit.fbAuthManager.uid)
		});
	}

	getWatchlist(movieId){
		firebase.firestore().collection(rhit.FB_COLLECTION_CULTFILMS).doc(movieId).get().then((doc) => {
			return doc.data()[rhit.FB_KEY_WATCHLIST];
		});
	}
}



rhit.loginPageController = class {
	constructor() {
		document.querySelector("#roseFireButton").onclick = (evnet) => {
			console.log("rose");
			rhit.fbAuthManager.signIn();
		}
	}
}

rhit.FbAuthManager = class {
	constructor() {
		this._user = null;
	}
	beginListening(changeListener) {
		firebase.auth().onAuthStateChanged((user) => {

			this._user = user;
			changeListener();
		});
	}
	signIn() {
		Rosefire.signIn("52bf7124-d3bd-4618-a9f5-1e7a6d5d2fe7", (err, rfUser) => {
			if (err) {
				console.log("Rosefire error!", err);
				return;
			}
			console.log("Rosefire success!", rfUser);

			// TODO: Use the rfUser.token with your server.

			firebase.auth().signInWithCustomToken(rfUser.token)
				.catch((error) => {
					const errorCode = error.code;
					const errorMessage = error.message;
					if (errorCode == 'auth/invalid-custom-token') {
						alert('The token is invalid');
					} else {
						console.error("Custom auth error", errorCode, errorMessage);
					}
				});
		});

	}
	signOut() { firebase.auth().signOut(); }
	get uid() {
		return this._user.uid;
	}
	get isSignedIn() { return !!this._user; }

}


rhit.initializePage = function(){

	const urlParams = new URLSearchParams(window.location.search);
	
	if (document.querySelector('#loginPage')) {
		console.log("You are on the login page");

		rhit.startFirebaseUI();

		new rhit.loginPageController();
	}


	if (document.querySelector('#listPage')) {
		console.log("You are on the list page.");
		const uid = urlParams.get('uid');
		rhit.fbFilmsManger = new rhit.FbFilmsManger(uid);
		new rhit.ListPageController();
		
	}
}

rhit.checkForRedirects = function () {
	if (document.querySelector('#loginPage') && rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/list.html";
	}

	if (!document.querySelector('#loginPage') && !rhit.fbAuthManager.isSignedIn) {
		window.location.href = "/";
	}
};




rhit.startFirebaseUI = function () {

	// FirebaseUI config.
	var uiConfig = {
		signInSuccessUrl: '/list.html',
		signInOptions: [
			// Leave the lines as is for the providers you want to offer your users.
			firebase.auth.GoogleAuthProvider.PROVIDER_ID,
			firebase.auth.EmailAuthProvider.PROVIDER_ID,
			firebase.auth.PhoneAuthProvider.PROVIDER_ID,
			firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID
		],
	};

	var ui = new firebaseui.auth.AuthUI(firebase.auth());
	ui.start('#firebaseui-auth-container', uiConfig);
};


rhit.main = function () {
	console.log("Ready");
	rhit.fbAuthManager = new rhit.FbAuthManager();
	this.fbAuthManager.beginListening(() => {
		console.log(rhit.fbAuthManager.isSignedIn);
		rhit.checkForRedirects();
		rhit.initializePage();
	});
};

rhit.main();
