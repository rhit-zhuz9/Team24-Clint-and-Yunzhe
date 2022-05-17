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
rhit.FB_COLLECTION_USERREVIEWS = "UserReviews"
rhit.FB_KEY_CONTENT = "content";
rhit.FB_KEY_FILMID_FOR_REVIEW = "filmId";
rhit.FB_KEY_AUTHOR = "author";
rhit.FB_KEY_LIKES = "likes";
rhit.fbFilmsManger = null;
rhit.fbAuthManager = null;
rhit.fbSingleFilmManager = null;
rhit.fbReviewManager = null;
rhit.fbReviewDetailManger = null;

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

		document.querySelector("#menuShowWatchlist").onclick = (event) => {
			window.location.href = `/list.html?uid=${rhit.fbAuthManager.uid}`;
		}

		document.querySelector("#menuSignOut").onclick = (event) => {
			rhit.fbAuthManager.signOut();
		}

		document.querySelector("#search").onkeypress = (event) => {
			if(event.key == 'Enter'){
				window.location.href = `/list.html?title=${document.querySelector("#search").value}`;
			}
		}

		$(function () {
			$('#collapse-search').on('hidden.bs.collapse', function () {
				$('#search').val('')
			})
		});

		rhit.fbFilmsManger.beginListening(this.updateList.bind(this))

	}

	async updateList() {
		const newList = htmlToElement('<div id="moviesContainer" class="rows justify-content-center"></div>');
		for (let i = 0; i < rhit.fbFilmsManger.length; i++) {
			const movie = rhit.fbFilmsManger.getFilmAtIndex(i);
			const newCard = await this._createdCard(movie);
			newCard.onclick = (event) => {
				//window.location.href = `/movieDetail.html?id=${movie.id}`;
			};
			newList.appendChild(newCard);
		}

		const oldList = document.querySelector("#moviesContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);
		const buttons = document.querySelectorAll(".addButton");
		buttons.forEach((button) => {
			const movieId = button.dataset.movieId;
			firebase.firestore().collection(rhit.FB_COLLECTION_CULTFILMS).doc(movieId).get().then((doc) => {
				const list = doc.data()[rhit.FB_KEY_WATCHLIST];
				if (list.includes(rhit.fbAuthManager.uid)) {
					button.innerHTML = "Remove";
					button.style.background = 'grey';
					button.onclick = (event) => {
						rhit.fbFilmsManger.removeFromWatchList(movieId);
					}
				} else {
					button.innerHTML = "Add";
					button.style.background = '#ff5c00';
					button.onclick = (event) => {
						rhit.fbFilmsManger.addToWatchList(movieId);
					}
				}
			});

		});

		const posters = document.querySelectorAll(".moviePoster");
		posters.forEach((poster) => {
			poster.onclick = (event) => {
				window.location.href = `/movieDetail.html?id=${poster.id}`;
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

		return htmlToElement(`<div class="pin col-6 col-md-4 col-xl-3">
        <img class="moviePoster" src = "${url}" alt="${Movie.title}" id="${Movie.id}">
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
	constructor(uid, title) {
		console.log("created movie manager");
		this._uid = uid;
		this._title = title;
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_CULTFILMS);
		this._unsubscribe = null;
	}
	beginListening(changeListener) {
		let query = this._ref.limit(40);
		if (this._uid) {
			query = query.where(rhit.FB_KEY_WATCHLIST, "array-contains", this._uid);
		}else if(this._title){
			query = query.where(rhit.FB_KEY_TITLE, "==", this._title);
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
		if (docSnapshot.get("watchlist") == null) {
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

	addToWatchList(movieId) {
		this._ref.doc(movieId).update({
			[rhit.FB_KEY_WATCHLIST]: firebase.firestore.FieldValue.arrayUnion(rhit.fbAuthManager.uid)
		});
	}

	removeFromWatchList(movieId) {
		this._ref.doc(movieId).update({
			[rhit.FB_KEY_WATCHLIST]: firebase.firestore.FieldValue.arrayRemove(rhit.fbAuthManager.uid)
		});
	}
}

rhit.DetailPageController = class {
	constructor() {

		document.querySelector("#menuShowAllMovies").onclick = (event) => {
			window.location.href = "/list.html";
		};

		document.querySelector("#menuShowWatchlist").onclick = (event) => {
			window.location.href = `/list.html?uid=${rhit.fbAuthManager.uid}`;
		};

		document.querySelector("#menuSignOut").onclick = (event) => {
			rhit.fbAuthManager.signOut();
		};

		document.querySelector("#reviewTitle").onclick = (event) => {
			window.location.href = `/userReview.html?id=${rhit.fbSingleFilmManager.id}&t=${rhit.fbSingleFilmManager.title}`;
		};
		rhit.fbSingleFilmManager.beginListening(this.updateView.bind(this));
		rhit.fbSingleFilmManager.beginListening2(this.updateTopReview.bind(this));
	}

	updateView() {
		document.querySelector("#title").innerHTML = rhit.fbSingleFilmManager.title;
		fetch(`////www.omdbapi.com/?apikey=5cb55cbf&t=${rhit.fbSingleFilmManager.title}`)
			.then(response => response.json())
			.then(data => {
				console.log(data);
				document.querySelector("#poster").src = data["Poster"];
				document.querySelector("#poster").alt = rhit.fbSingleFilmManager.title;
				document.querySelector("#plot").innerHTML = data["Plot"];
				document.querySelector("#director").innerHTML = data["Director"];
				document.querySelector("#actor").innerHTML = data["Actors"];
				document.querySelector("#boxOffice").innerHTML = data["BoxOffice"];
			})
	}

	updateTopReview(content) {
		document.querySelector("#topReviewContent").innerHTML = content;
	}

}

rhit.FbSingleFilmManger = class {
	constructor(movieId) {
		this.movieId = movieId;
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_CULTFILMS).doc(movieId);
		this._unsubscribe = null;
		this._ref2 = firebase.firestore().collection(rhit.FB_COLLECTION_USERREVIEWS)
	}
	beginListening(changeListener) {

		this._unsubscribe = this._ref.onSnapshot((doc) => {
			if (doc.exists) {
				console.log("Document data:", doc.data());
				this._documentSnapshot = doc;
				changeListener();
			} else {
				console.log("No such document!");
				//window.location.href = "/";
			}
		});
	}

	beginListening2(changeListener) {
		let query = this._ref2.limit(1).where(rhit.FB_KEY_FILMID_FOR_REVIEW, "==", this.movieId).orderBy(rhit.FB_KEY_LIKES, "desc");

		this._unsubscribe = query.onSnapshot((querySnapshot) => {
			if (querySnapshot.docs.length != 0) {
				const content = querySnapshot.docs[0].get(rhit.FB_KEY_CONTENT);
				changeListener(content);
			} else {
				changeListener(null);
			}

		});
	}
	stopListening() {
		this._unsubscribe();
	}

	delete() {
		return this._ref.delete();
	}

	get title() {
		return this._documentSnapshot.get(rhit.FB_KEY_TITLE);
	}

	get id() {
		return this.movieId;
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

rhit.Review = class {
	constructor(id, filmId, content, likes) {
		this.id = id;
		this.filmId = filmId;
		this.content = content;
		this.likes = likes
	}
}

rhit.ReviewPageController = class {
	constructor() {
		document.querySelector("#menuShowAllMovies").onclick = (event) => {
			window.location.href = "/list.html";
		}

		document.querySelector("#menuShowWatchlist").onclick = (event) => {
			window.location.href = `/list.html?uid=${rhit.fbAuthManager.uid}`;
		}

		document.querySelector("#menuSignOut").onclick = (event) => {
			rhit.fbAuthManager.signOut();
		}

		$("#addReviewDialog").on("show.bs.modal", (event) => {
			//pre animation
			document.querySelector("#inputContent").value = "";
		});

		$("#addReviewDialog").on("shown.bs.modal", (event) => {
			//post animation
			document.querySelector("#inputContent").focus();
		});

		document.querySelector("#submitAddReview").addEventListener("click", (event) => {
			const content = document.querySelector("#inputContent").value;
			rhit.fbReviewManager.add(content);
		});



		rhit.fbReviewManager.beginListening(this.updateView.bind(this))
	}

	updateView() {
		document.querySelector('#title').innerHTML = rhit.fbReviewManager.title;
		fetch(`////www.omdbapi.com/?apikey=5cb55cbf&t=${rhit.fbReviewManager.title}`)
			.then(response => response.json())
			.then(data => {
				// console.log(data);
				document.querySelector("#poster").src = data["Poster"];
			})
		const newList = htmlToElement('<div id="reviewsContainer"></div>');
		for (let i = 0; i < rhit.fbReviewManager.length; i++) {
			const review = rhit.fbReviewManager.getReviewAtIndex(i);
			const newCard = this._createdCard(review);
			newCard.onclick = (event) => {
				window.location.href = `/reviewDetail.html?id=${review.id}`;
			};
			newList.appendChild(newCard);
		}

		const oldList = document.querySelector("#reviewsContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.appendChild(newList);

		const likeButtons = document.querySelectorAll(".like-button");
		likeButtons.forEach((button) => {
			button.onclick = (event) => {
				const reviewId = button.dataset.reviewId;
				const likesNum = button.dataset.likesNum;
				rhit.fbReviewManager.incLikes(reviewId, likesNum)
			}
		})
	}

	_createdCard(review) {
		return htmlToElement(`<div class="review-content"><p id="${review.id}">${review.content}</p><p class="likes">
		<i class="material-icons like-button" data-review-id="${review.id}" data-likes-num=${review.likes}>favorite</i>&nbsp;&nbsp;${review.likes}</p></div>`);
	}
}



rhit.FbReviewManager = class {
	constructor(movieId, movieTitle) {
		this.id = movieId;
		this.title = movieTitle;
		this._documentSnapshots = [];
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_USERREVIEWS);
		this._unsubscribe = null;
	}

	beginListening(changeListener) {
		let query = this._ref.limit(40).where(rhit.FB_KEY_FILMID_FOR_REVIEW, "==", this.id).orderBy(rhit.FB_KEY_LIKES, "desc");

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

	getReviewAtIndex(index) {
		const docSnapshot = this._documentSnapshots[index];
		const review = new rhit.Review(
			docSnapshot.id,
			docSnapshot.get(rhit.FB_KEY_FILMID_FOR_REVIEW),
			docSnapshot.get(rhit.FB_KEY_CONTENT),
			docSnapshot.get(rhit.FB_KEY_LIKES)
		);
		return review;
	}

	incLikes(id, likesNum) {
		const output = parseInt(likesNum) + 1;
		this._ref.doc(id).update({
			[rhit.FB_KEY_LIKES]: output
		}).then(() => {
			console.log("Document successfully updated!");
		})
			.catch((error) => {
				// The document probably doesn't exist.
				console.error("Error updating document: ", error);
			});
	}

	add(content) {
		this._ref.add({
			[rhit.FB_KEY_CONTENT]: content,
			[rhit.FB_KEY_FILMID_FOR_REVIEW]: this.id,
			[rhit.FB_KEY_AUTHOR]: rhit.fbAuthManager.uid,
			[rhit.FB_KEY_LIKES]: 0
		})
			.then(function (docRef) {
				console.log("Document written with ID: ", docRef.id)
			})
			.catch(function (error) {
				console.error("Error adding document: ", error)
			});
	}

	get length() {
		return this._documentSnapshots.length;
	}

}

rhit.reviewDetailController = class {
	constructor() {

		document.querySelector("#submitEditContent").addEventListener("click", (event) => {
			const content = document.querySelector("#inputContent").value;
			rhit.fbReviewDetailManger.update(content);
		});


		$("#editContentDialog").on("show.bs.modal", (event) => {
			//pre animation
			document.querySelector("#inputContent").value = rhit.fbReviewDetailManger.content;
		});

		$("#editContentDialog").on("shown.bs.modal", (event) => {
			//post animation
			document.querySelector("#inputContent").focus();
		});

		document.querySelector("#menuSignOut").onclick = (event) => {
			rhit.fbAuthManager.signOut();
		};

		document.querySelector("#submitDeleteContent").addEventListener("click", (event) => {
			rhit.fbReviewDetailManger.delete().then(() => {
				console.log("Document successfully deleted!");
				window.location.href = "/list.html";
			}).catch((error) => {
				console.error("Error removing document: ", error);
			});
		});

		document.querySelector("#menuShowAllMovies").onclick = (event) => {
			window.location.href = "/list.html";
		};

		document.querySelector("#menuShowWatchlist").onclick = (event) => {
			window.location.href = `/list.html?uid=${rhit.fbAuthManager.uid}`;
		};

		rhit.fbReviewDetailManger.beginListening(this.updateView.bind(this));
	}

	updateView() {
		document.querySelector("#reviewContent").innerHTML = rhit.fbReviewDetailManger.content;
		if (rhit.fbReviewDetailManger.author == rhit.fbAuthManager.uid) {
			document.querySelector("#menuEdit").style.display = "flex";
			document.querySelector("#menuDelete").style.display = "flex";
		}
	}
}

rhit.FbReviewDetailManager = class {
	constructor(reviewId) {
		this._documentSnapshot = {};
		this._unsubscribe = null;
		this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_USERREVIEWS).doc(reviewId);
	}

	beginListening(changeListener) {

		this._unsubscribe = this._ref.onSnapshot((doc) => {
			if (doc.exists) {
				this._documentSnapshot = doc;
				changeListener();
			} else {
				console.log("No such document!");
				//window.location.href = "/";
			}
		});
	}
	stopListening() {
		this._unsubscribe();
	}

	update(content) {
		this._ref.update({
			[rhit.FB_KEY_CONTENT]: content,
		})
			.then(() => {
				console.log("Document successfully updated!");
			})
			.catch((error) => {
				// The document probably doesn't exist.
				console.error("Error updating document: ", error);
			});
	}

	delete() {
		return this._ref.delete();
	}

	get content() {
		return this._documentSnapshot.get(rhit.FB_KEY_CONTENT);
	}

	get author() {
		return this._documentSnapshot.get(rhit.FB_KEY_AUTHOR);
	}
}

rhit.initializePage = function () {

	const urlParams = new URLSearchParams(window.location.search);

	if (document.querySelector('#loginPage')) {
		console.log("You are on the login page");

		rhit.startFirebaseUI();

		new rhit.loginPageController();
	}


	if (document.querySelector('#listPage')) {
		console.log("You are on the list page.");
		const uid = urlParams.get('uid');
		const title = urlParams.get('title');
		rhit.fbFilmsManger = new rhit.FbFilmsManger(uid, title);
		new rhit.ListPageController();

	}

	if (document.querySelector('#detailPage')) {
		console.log("You are on the detail page.");
		const id = urlParams.get('id');
		console.log(id);
		rhit.fbSingleFilmManager = new rhit.FbSingleFilmManger(id);
		new rhit.DetailPageController();

	}

	if (document.querySelector('#reviewPage')) {
		console.log("You are on the review page.");
		const id = urlParams.get('id');
		const title = urlParams.get('t');
		console.log(id);
		rhit.fbReviewManager = new rhit.FbReviewManager(id, title);
		new rhit.ReviewPageController();
	}

	if (document.querySelector('#reviewDetailPage')) {
		console.log("You are on the review detail page");
		const id = urlParams.get('id');
		rhit.fbReviewDetailManger = new rhit.FbReviewDetailManager(id);
		new rhit.reviewDetailController();
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
