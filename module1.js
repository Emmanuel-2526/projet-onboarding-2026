/*****************************************************************/
/*** Auteur   : Emmanuel L.    Date    : 02/04/2026     ***/
/*** Fichier  : module1.js            Version : 1.0.0          ***/
/*** Titre    : Formulaire onboarding (logique côté client)    ***/
/*****************************************************************/
/*
  Rôle : validation, buildParam, AJAX vers module1edit.phpi (datalists,
         unicité, prix), génération auto initiales/mail/account.

  Conventions des tags dans les commentaires :
    [FRAMEWORK]      Imposé par app.js / edit.js / modal.js - ne pas renommer.
    [FRAMEWORK-CSS]  Classe CSS lue par le framework (.click-add, .modal-alert…).
    [BOOTSTRAP]      Classe Bootstrap 5.
    [STYLE.CSS]        Classe de css/style.css.
    [boarding.js]    Copié de modules/IT/boarding/boarding.js (Hoeffel N. 2023).
    [MODULE]         Code propre à ce module.
*/

//****************************************************************//
//*** 1. PARAMÈTRES ET INITIALISATION (Framework)              ***//
//****************************************************************//

/*** PARAMÈTRES DU FRAMEWORK [FRAMEWORK] - Variables globales lues par app.js/modal.js au chargement. Noms obligatoires, ne pas renommer. ***/

var moduleTitle = 'Onboarding';
var searchBarEnable = 'visible';        // Affiche ou masque la barre de recherche
var searchBarText = 'Name, company, team';
var searchDiv = '#searchlist';          // Conteneur HTML où module1search.phpi est injecté
var searchGetParam = 'search';          // Paramètre GET envoyé à module1search.phpi
var confirmUpdateDelete = 1;            // 1 = passage par l'étape act=3 (confirmation) avant suppression
var searchTargetRef = '/modules/Dev/module1/module1search.phpi';
var editURL = '/modules/Dev/module1/module1edit.phpi';
var reloadContent = '/modules/Dev/module1/module1.phpi';
var fctAjax = "/modules/Dev/module1/module1edit.phpi"; // URL cible de tous les appels AJAX du module
var bModalClosable = false;             // La modale ne peut pas être fermée en cliquant en dehors
var bReloadContent = true;              // Recharge le tableau automatiquement après act=4
var iReloadTimeout = 300000;           // Délai avant rechargement automatique (300 000 ms = 5 min)
var idInitialsCheckTimeout;            // Timer debounce pour la vérification des initiales (400 ms)
var idMailCheckTimeout;                // Timer debounce pour la vérification de l'email (400 ms)
var sCompanyMailDomain = '';           // Domaine email résolu via fct=19 (ex: "exemple.lu")
var sReloadOpt = '';

updateModuleTitle(); // [FRAMEWORK] Injecte moduleTitle dans le bandeau de l'application

/*** INITIALISATION DU MODULE [MODULE] ***/

var selectedId = 0; // Stocke l'id_employee sélectionné par le menu contextuel

$(document).ready(function() {
	updateSearch();      // [FRAMEWORK] Charge module1search.phpi en AJAX dans #searchlist (edit.js)
	buildErrorMsg();     // [MODULE]    Lit les <param> ErrCde/ErrMsg et affiche le message de retour
	initModalAutoload(); // [MODULE]    Auto-charge les datalists quand la modale est injectée
});

/*** initModalAutoload() [MODULE]
     Pourquoi cette approche ?
     Le framework (modal.js) injecte le formulaire #frmEdit en AJAX dans #divModalNotClosable
     ou #divmodalClosable APRÈS le chargement de la page. On ne peut donc pas brancher
     directement des $(document).ready() sur #frmEdit - il n'existe pas encore.
     Un MutationObserver surveille les deux conteneurs stables et déclenche le bon loader
     dès que #frmEdit apparaît dans le DOM, sans avoir besoin de <script> inline dans le PHP.

     Pourquoi le fingerprint ?
     Sans lui, chaque mutation interne du formulaire (ex: ajout d'une ligne Software, affichage
     d'un message d'erreur) relancerait les datalists. Le fingerprint (form|act|bootId) garantit
     que le chargement n'a lieu qu'une seule fois par ouverture de modale. ***/
function initModalAutoload()
{
	/* Les deux conteneurs dans lesquels modal.js peut injecter #frmEdit */
	var aTargets = ['#divmodalClosable', '#divModalNotClosable'];

	/* Empreinte de la dernière instance de #frmEdit traitée - évite les rechargements multiples */
	var sLastFrmId = '';

	/* Vérifie si un nœud DOM est #frmEdit ou le contient */
	function bIsOrContainsFrmEdit(oNode) {
		if(!oNode || oNode.nodeType !== 1) return false;
		if(oNode.id === 'frmEdit') return true;
		return !!oNode.querySelector && !!oNode.querySelector('#frmEdit');
	}

	var oObserver = new MutationObserver(function(aMutations) {
		var bFrmInjected = false;
		for(var i = 0; i < aMutations.length && !bFrmInjected; i++)
		{
			var aAdded = aMutations[i].addedNodes;
			for(var j = 0; j < aAdded.length; j++)
			{
				if(bIsOrContainsFrmEdit(aAdded[j])) { bFrmInjected = true; break; }
			}
		}
		if(!bFrmInjected) return; // Mutation interne (ex: ajout ligne Software) - on ignore

		var oFrm = document.getElementById('frmEdit');
		if(!oFrm) return;

		/* Fingerprint : combinaison form|act|bootId unique par instance de modale */
		var sFingerprint = ($('#frmEdit #form').val() || '') + '|' + ($('#frmEdit #act').val() || '') + '|' + (oFrm.dataset.bootId || (oFrm.dataset.bootId = String(Date.now()) + Math.random()));
		if(sFingerprint === sLastFrmId) return; // Même instance déjà traitée
		sLastFrmId = sFingerprint;

		var sFormType = $('#frmEdit #form').val() || '';
		var sAct      = $('#frmEdit #act').val()  || '';

		/* Formulaire Onboarding (act=1 : création, act=2 : édition) → charge les datalists */
		if(sFormType === 'onboarding' && (sAct === '1' || sAct === '2'))
		{
			if(typeof loadAllOnboardingDatalists === 'function')
				setTimeout(loadAllOnboardingDatalists, 0); // setTimeout 0 : laisse le DOM se stabiliser avant l'AJAX
		}
		/* Formulaire Software (act=1 uniquement) → charge users et softwares */
		else if(sFormType === 'software' && sAct === '1')
		{
			if(typeof loadUsersList === 'function')     loadUsersList();
			if(typeof loadSoftwaresList === 'function') loadSoftwaresList();
		}
		/* Formulaire Approval (act=1) supprimé : approbation via badge Tasks (tasksinfo.phpi) */
	});

	/* Branche l'observer sur chaque conteneur modal existant dans le DOM */
	for(var k = 0; k < aTargets.length; k++)
	{
		var oNode = document.querySelector(aTargets[k]);
		if(oNode) oObserver.observe(oNode, { childList: true, subtree: true });
	}
}

//****************************************************************//
//*** 2. VALIDATION ET ENVOI DES FORMULAIRES                   ***//
//****************************************************************//

/*** VALIDATION ET ENVOI [FRAMEWORK] ***/

/*** validate() [FRAMEWORK] - Appelée par modal.js avant btnAdd/btnUpdate. Vérifie les champs obligatoires (Software ou Onboarding). ***/
/* Classes CSS utilisées : .modal-alert [FRAMEWORK-CSS], .txt-error [STYLE.CSS] */
function validate() {
	var strErr = '';
	var bValid = false;

	var sForm = $('#form').val();

	if(sForm == 'software')
	{
		if($('#User').val() == '')
			strErr = strErr + 'User ';

		/* Nom tapé mais ID non résolu → ambigu */
		if($('#User').val() != '' && $('#UserId').val() == '')
		{
			displayErrorMsg(true, 'User not recognized or ambiguous. Please pick one from the suggestions.', '.modal-alert');
			return false;
		}

		var iFilled = 0;
		var bRowError = false;
		$('#softwareRows > .input-group').each(function() {
			var sSoft = $(this).find('input[name="Software[]"]').val();
			var sCost = $(this).find('input[name="Cost[]"]').val();
			if(sSoft != '')
			{
				iFilled++;
				/* Cost est auto-rempli via fct=11 - s'il est vide, c'est que le software saisi n'existe pas dans bApplicationPrice */
				if(sCost == '' || isNaN(parseFloat(sCost.replace(',', '.'))))
					bRowError = true;
			}
		});
		if(iFilled == 0)
			strErr = strErr + 'Software ';
		if(bRowError)
		{
			displayErrorMsg(true, 'Each software line must be a known application (pick one from the suggestions).', '.modal-alert');
			return false;
		}
	}
	else if(sForm === 'approval')
	{
		var sDecision = $('input[name="approval_decision"]:checked').val() || '';
		if(sDecision === '')
		{
			displayErrorMsg(true, 'Veuillez sélectionner une décision : Approved, Pending ou Refused.', '.modal-alert');
			return false;
		}
		if((sDecision === 'Pending' || sDecision === 'Refused') && $('#Comment').val().trim() === '')
		{
			displayErrorMsg(true, 'Un commentaire est obligatoire pour Pending et Refused.', '.modal-alert');
			return false;
		}
		/* Etape 3 : si Approved, les 5 cases Final Check doivent toutes etre cochees */
		var sStep = $('#ApprovalStep').val() || '';
		if(sStep === '3' && sDecision === 'Approved')
		{
			var iChecked = $('input[name^="finalcheck_"]:checked').length;
			if(iChecked < 5)
			{
				displayErrorMsg(true, 'Final Check : les 5 cases doivent etre cochees avant Approved.', '.modal-alert');
				return false;
			}
		}
		return true;
	}
	else
	{
		/* Champs obligatoires Onboarding */
		if($('#LastName').val() == '')
			strErr = strErr + 'Last Name ';
		if($('#FirstName').val() == '')
			strErr = strErr + 'First Name ';
		if($('#Company').val() == '')
			strErr = strErr + 'Company ';
		if($('#Initials').val() == '')
			strErr = strErr + 'Initials ';
		if($('#JobTitle').val() == '')
			strErr = strErr + 'Job Title ';
		if($('#Team').val() == '')
			strErr = strErr + 'Team ';
		if($('#Manager').val().trim() == '')
			strErr = strErr + 'Manager ';
		if($('#Mail').val() == '')
			strErr = strErr + 'Mail ';

		/* Format LastName/FirstName : lettres uniquement (accents, espaces et traits d'union autorisés) */
		var reNom = /^[a-zA-ZÀ-ÿ \-']+$/;
		if($('#LastName').val() != '' && !reNom.test($('#LastName').val()))
		{
			displayErrorMsg(true, 'Last Name: only letters are allowed (no digits or special characters).', '.modal-alert');
			return false;
		}
		if($('#FirstName').val() != '' && !reNom.test($('#FirstName').val()))
		{
			displayErrorMsg(true, 'First Name: only letters are allowed (no digits or special characters).', '.modal-alert');
			return false;
		}

		/* Format AccountName : minuscules uniquement */
		if($('#AccountName').val() != '' && !/^[a-z]+$/.test($('#AccountName').val()))
		{
			displayErrorMsg(true, 'Account Name: only lowercase letters are allowed (no digits or special characters).', '.modal-alert');
			return false;
		}

		/* Format Mail : validation du format via validateEmail() [FRAMEWORK] (main.js) */
		if($('#Mail').val() != '' && !validateEmail($('#Mail').val()))
		{
			displayErrorMsg(true, 'Mail: invalid email format.', '.modal-alert');
			return false;
		}

		/* Initiales/Mail marqués en rouge (txt-error) = doublon détecté par changeDisplayOnError (fct=12/13) */
		if($('#Initials').hasClass('txt-error'))
		{
			displayErrorMsg(true, 'These initials are already in use. Please choose different initials.', '.modal-alert');
			return false;
		}
		if($('#Mail').hasClass('txt-error'))
		{
			displayErrorMsg(true, 'This mail already exists. Please choose another.', '.modal-alert');
			return false;
		}
		/* LastName/FirstName/AccountName marqués en rouge = doublon détecté par checkOnboarderExists (fct=15) */
		if($('#AccountName').hasClass('txt-error'))
		{
			displayErrorMsg(true, 'This account name already exists in AD or Onboarder. Please change it.', '.modal-alert');
			return false;
		}
		if($('#LastName').hasClass('txt-warning') || $('#FirstName').hasClass('txt-warning'))
		{
			if($('#Initials').hasClass('txt-error'))
			{
				displayErrorMsg(true, 'Homonym detected: these initials are already in use. Please change them to distinguish this person.', '.modal-alert');
				return false;
			}
			if($('#AccountName').hasClass('txt-error'))
			{
				displayErrorMsg(true, 'Homonym detected: this account name already exists. Please change it to distinguish this person.', '.modal-alert');
				return false;
			}
		}
	}

	if(strErr != '')
	{
		displayErrorMsg(true, strErr, '.modal-alert');
		bValid = false;
	}
	else
		bValid = true;

	return bValid;
}

/*** buildParam() [FRAMEWORK] - Appelée par modal.js pour construire la chaîne de paramètres GET envoyée à module1edit.phpi en act=4. ***/
function buildParam() {
	var sForm = $('#form').val();
	var targetParam = '';

	if(sForm == 'software')
	{
		var aSoft = [];
		/* Lignes Software sérialisées en pipe (|) pour passer dans l'URL. Le coût n'est pas transmis : il est calculé côté SQL via dbo.bApplicationPrice.Price. */
		$('#softwareRows > .input-group').each(function() {
			var sSoft = $(this).find('input[name="Software[]"]').val();
			if(sSoft != '') aSoft.push(encodeURIComponent(sSoft));
		});

		targetParam =
			'form=software' + '&' +
			'id=' + $('input[name="Id"]').val() + '&' +
			'softwares=' + aSoft.join('|') + '&' +
			'user=' + encodeURIComponent($('#User').val() || '') + '&' +
			'userid=' + $('#UserId').val()
		;
	}
	else if(sForm === 'approval')
	{
		/* Final Check CSV (5 valeurs 0/1) - seulement pertinent pour etape 3 */
		var sFinalCheck = '';
		for(var i = 1; i <= 5; i++)
			sFinalCheck += ($('input[name="finalcheck_' + i + '"]').is(':checked') ? '1' : '0') + (i < 5 ? ',' : '');

		targetParam =
			'form=approval'      + '&' +
			'id='                + ($('input[name="Id"]').val()                           || '') + '&' +
			'idrequest='         + ($('#IdRequest').val()                                 || '') + '&' +
			'approvalstep='      + ($('#ApprovalStep').val()                              || '') + '&' +
			'decision='          + ($('input[name="approval_decision"]:checked').val()    || '') + '&' +
			'comment='           + encodeURIComponent($('#Comment').val()                 || '') + '&' +
			'revert='            + ($('#Revert').val()                                    || '0') + '&' +
			'finalcheck='        + sFinalCheck
		;
	}
	else
	{
		targetParam =
			'form=onboarding' + '&' +
			'id=' + encodeURIComponent($('input[name="Id"]').val() || '') + '&' +
			'lastname=' + encodeURIComponent($('#LastName').val() || '') + '&' +
			'firstname=' + encodeURIComponent($('#FirstName').val() || '') + '&' +
			'accountname=' + encodeURIComponent($('#AccountName').val() || '') + '&' +
			'company=' + encodeURIComponent($('#Company').val() || '') + '&' +
			'initials=' + encodeURIComponent($('#Initials').val() || '') + '&' +
			'jobtitle=' + encodeURIComponent($('#JobTitle').val() || '') + '&' +
			'team=' + encodeURIComponent($('#Team').val() || '') + '&' +
			'manager=' + encodeURIComponent($('#Manager').val() || '') + '&' +
			'mail=' + encodeURIComponent($('#Mail').val() || '') + '&' +
			'startdate=' + encodeURIComponent($('#StartDate').val() || '') + '&' +
			'enddate=' + encodeURIComponent($('#EndDate').val() || '')
		;
	}

	return targetParam;
}

//****************************************************************//
//*** 3. GESTION DE L'INTERFACE (Erreurs et Menu Contextuel)   ***//
//****************************************************************//

/*** buildErrorMsg() [FRAMEWORK] - Appelée par le framework au chargement. Lit #ErrCde/#ErrMsg et appelle displayErrorMsg() [FRAMEWORK]. Cible : .module-msgalert [FRAMEWORK-CSS]. ***/
function buildErrorMsg() {
	if($('#ErrCde').val() != 'e10000000')
	{
		var isError = false;

		isError = (
			$('#ErrCde').val() == 'e10004510' ||
			$('#ErrCde').val() == 'e10004511' ||
			$('#ErrCde').val() == 'e10004512' ||
			$('#ErrCde').val().indexOf('Error:') === 0
		);

		displayErrorMsg(isError, $('#ErrMsg').val(), '.module-msgalert');
	}
}

/*** context() [FRAMEWORK] - Appelée par le framework au clic droit sur une ligne (.click-context [FRAMEWORK-CSS]). Les #btnct01 à #btnct10 sont des IDs HTML injectés par le framework. ***/
function context(oSrc) {
	selectedId = $(oSrc).closest("tr").find("[id='Id']").val();

	$("#btnct01").css('display', 'none');
	$("#btnct02").css('display', 'none');
	$("#btnct03").css('display', 'none');
	$("#btnct04").css('display', 'none');
	$("#btnct05").css('display', 'none');
	$("#btnct06").css('display', 'none');
	$("#btnct07").css('display', 'none');
	$("#btnct08").css('display', 'none');
	$("#btnct09").css('display', 'none');
	$("#btnct10").css('display', 'none');

	/* btnct01 "Gérer approbations" supprimé : approbation via badge Tasks (tasksinfo.phpi) */
}

function contextMenuBtn01() { /* supprimé : approbation via badge Tasks */ }

/* contextMenuBtn02 à 10 : non utilisés dans ce module (réservés par le framework pour d'autres actions contextuelles) */
function contextMenuBtn02() { }
function contextMenuBtn03() { }
function contextMenuBtn04() { }
function contextMenuBtn05() { }
function contextMenuBtn06() { }
function contextMenuBtn07() { }
function contextMenuBtn08() { }
function contextMenuBtn09() { }
function contextMenuBtn10() { }

/*** click-add-onboarding [MODULE] - Bouton "+ Onboarder". Délégué à #searchlist (conteneur stable des résultats). ***/
$('#searchlist').on('click', '.click-add-onboarding', function() {
	loadModalEdit('act=1&form=onboarding');
});

/*** click-add-software [MODULE] - Bouton "+ Software" sur chaque ligne employé, injecté dans #searchlist. ***/
$('#searchlist').on('click', '.click-add-software', function() {
	loadModalEdit('act=1&form=software');
});

/*** HANDLERS DÉLÉGUÉS [MODULE] - Branche tous les évènements sur les champs des formulaires Onboarding/Software.
     Délégation jQuery sur #modalNotClosable (conteneur stable, jamais supprimé du DOM) - pattern identique à modal.js:132.
     Aucun onchange/onclick inline dans le PHP : tout est centralisé ici. ***/

var $oModal = $('#modalNotClosable'); // [FRAMEWORK] Conteneur modal stable (index.php, jamais supprimé)
$oModal.off('.m1'); // Supprime les handlers d'une exécution précédente (module1.js est ré-exécuté à chaque rechargement de #content)

/* ---- ONBOARDING : champs texte (LastName, FirstName, AccountName, JobTitle, Initials, Mail) ---- */

/* Last Name / First Name : formate, génère initiales/mail/account et vérifie l'unicité au blur */
$oModal.on('blur.m1','#LastName, #FirstName', function() { onUsernameChange(); });

/* Last Name / First Name : bloque en temps réel les chiffres et caractères spéciaux */
$oModal.on('input.m1','#LastName, #FirstName', function() {
	this.value = this.value.replace(/[^a-zA-ZÀ-ÿ \-']/g, '');
});

/* Last Name / First Name : verrouille le champ après saisie pour empêcher toute modification ultérieure */
$oModal.on('blur.m1','#LastName, #FirstName', function() {
	if($(this).val().trim() !== '')
		$(this).prop('readonly', true);
});

/* Last Name / First Name : si verrouillé, Backspace/Suppr déverrouille et vide (ajout uniquement) ; sinon bloque la saisie */
$oModal.on('keydown.m1','#LastName, #FirstName', function(e) {
	if(!$(this).prop('readonly')) return;
	var aAllowed = [9, 16, 17, 18, 27, 35, 36, 37, 38, 39, 40]; // Tab, Shift, Ctrl, Alt, Esc, Home, End, flèches
	if(e.ctrlKey || e.metaKey) return;
	if($.inArray(e.keyCode, aAllowed) !== -1) return;
	if($('#act').val() !== '2' && (e.keyCode === 8 || e.keyCode === 46)) // Backspace/Delete → déverrouille (act=1 seulement)
	{
		$(this).val('').prop('readonly', false);
		e.preventDefault();
		return;
	}
	e.preventDefault();
});

/* Account Name : minuscules uniquement, pas de chiffres ni caractères spéciaux */
$oModal.on('input.m1','#AccountName', function() {
	this.value = this.value.toLowerCase().replace(/[^a-z]/g, '');
});

/* Account Name : re-vérifie le doublon à chaque modification */
$oModal.on('blur.m1','#AccountName', function() { checkOnboarderExists(); });

/* Job Title : lettres uniquement (accents, espaces et tirets autorisés) */
$oModal.on('input.m1','#JobTitle', function() {
	this.value = this.value.replace(/[^a-zA-ZÀ-ÿ \-']/g, '');
});

/* Initials : MAJ auto + contrôle visuel d'erreur */
$oModal.on('input.m1', '#Initials', function() { this.value = this.value.toUpperCase(); });
$oModal.on('change.m1','#Initials', function() { changeDisplayOnError($(this)); });

/* Mail : filtre les caractères invalides et contrôle visuel d'erreur */
$oModal.on('input.m1', '#Mail', function() { this.value = this.value.replace(/[^a-zA-Z0-9@.\-_]/g, ''); });
$oModal.on('change.m1','#Mail', function() { changeDisplayOnError($(this)); });

/* ---- ONBOARDING : cascade Company → Team → JobTitle / Manager ---- */

/* Company : recalcule mail (domaine) puis recharge la liste des Teams (fct=16) */
$oModal.on('change.m1','#Company', function() { generateMail(); loadAfterCompany(); });

/* Company : bloquer toute saisie clavier sauf Suppr/Retour arrière qui vident le champ */
$oModal.on('keydown.m1','#Company', function(e) {
	var aAllowed = [9, 16, 17, 18, 27, 35, 36, 37, 38, 39, 40]; // Tab, Shift, Ctrl, Alt, Esc, Home, End, flèches
	if(e.ctrlKey || e.metaKey) return;
	if($.inArray(e.keyCode, aAllowed) !== -1) return;
	if(e.keyCode === 8 || e.keyCode === 46) // Backspace ou Delete → vide le champ et rouvre la liste
	{
		$(this).val('').trigger('change');
		var $d = $('#CompanyDisambig');
		if($d.children().length > 0) $d.show();
		e.preventDefault();
		return;
	}
	e.preventDefault();
});

/* Company : clic sur le champ (même déjà focalisé) → rouvre le menu pour changer de société */
$oModal.on('click.m1','#Company', function() {
	var $d = $('#CompanyDisambig');
	if($d.children().length > 0) $d.show();
});

/* Team : recharge JobTitles (fct=17) et résout le manager (fct=18) */
$oModal.on('change.m1','#Team', function() { loadAfterTeam(); });

/* Team : filtrer les caractères invalides (lettres, chiffres, espaces, - et _) */
$oModal.on('input.m1','#Team', function() {
	this.value = this.value.replace(/[^a-zA-Z0-9 \-_]/g, '');
});

/* Team : Backspace/Suppr → vide le champ et rouvre la liste */
$oModal.on('keydown.m1','#Team', function(e) {
	if(e.keyCode === 8 || e.keyCode === 46)
	{
		$(this).val('').trigger('change');
		var $d = $('#TeamDisambig');
		if($d.children().length > 0) $d.show();
		e.preventDefault();
	}
});

/* Team : clic sur le champ → rouvre la liste */
$oModal.on('click.m1','#Team', function() {
	var $d = $('#TeamDisambig');
	if($d.children().length > 0) $d.show();
});

/* Manager : affiche Job Title dès que le champ Manager est rempli (sélection uniquement) */
$oModal.on('change.m1','#Manager', function() {
	if($(this).val().trim() !== '')
		$("#d_jobtitle").css("display", 'block');
	else
		$("#d_jobtitle").css("display", 'none');
});

/* Manager : bloquer toute saisie clavier sauf Suppr/Retour arrière qui vident le champ */
$oModal.on('keydown.m1','#Manager', function(e) {
	var aAllowed = [9, 16, 17, 18, 27, 35, 36, 37, 38, 39, 40]; // Tab, Shift, Ctrl, Alt, Esc, Home, End, flèches
	if(e.ctrlKey || e.metaKey) return;
	if($.inArray(e.keyCode, aAllowed) !== -1) return;
	if(e.keyCode === 8 || e.keyCode === 46) // Backspace ou Delete → vide le champ et rouvre la liste
	{
		$(this).val('').trigger('change');
		var $d = $('#ManagerDisambig');
		if($d.children().length > 0) $d.show();
		e.preventDefault();
		return;
	}
	e.preventDefault();
});

/* Manager : clic sur le champ (même déjà focalisé) → rouvre le menu pour changer de manager */
$oModal.on('click.m1','#Manager', function() {
	var $d = $('#ManagerDisambig');
	if($d.children().length > 0) $d.show();
});

/* ---- ONBOARDING : désambiguïsation (radios Company / Team / JobTitle) ---- */

/* Listes inline affichées sous le champ, à l'intérieur du formulaire */
var oDisambigMap = {
	'Company':  '#CompanyDisambig',
	'Team':     '#TeamDisambig',
	'Manager':  '#ManagerDisambig',
	'JobTitle': '#JobTitleDisambig'
};

/* Company : choix d'une société parmi les radios #CompanyDisambig */
$oModal.on('click.m1','input[name="companyDisambig"]', function() {
	$('#Company').val($(this).data('label')).trigger('change');
	$('#CompanyDisambig').hide();
});

/* Team : choix d'une équipe parmi les radios #TeamDisambig */
$oModal.on('click.m1','input[name="teamDisambig"]', function() {
	$('#Team').val($(this).data('label')).trigger('change');
	$('#TeamDisambig').hide();
});

/* Job Title : choix d'un poste parmi les radios #JobTitleDisambig */
$oModal.on('click.m1','input[name="jobTitleDisambig"]', function() {
	$('#JobTitle').val($(this).data('label'));
	$('#JobTitleDisambig').hide();
});

/* Manager : pas de liste complète AD - les managers sont proposés via #ManagerDisambig (fct=18) ;
   si aucun trouvé, le champ reste libre pour saisie manuelle */
$oModal.on('click.m1','input[name="managerDisambig"]', function() { pickManager(this); });

/* focus - affiche la liste si elle a du contenu, ferme les autres */
$oModal.on('focus.m1','#Company, #Team, #Manager, #JobTitle', function() {
	var sId = this.id;
	var $oDisambig = $(oDisambigMap[sId]);
	$.each(oDisambigMap, function(sKey, sVal) {
		if(sKey !== sId) $(sVal).hide();
	});
	if($oDisambig.children().length > 0) $oDisambig.show();
});

/* mousedown dans la liste - empêche le blur du champ input avant que le clic radio ne s'enregistre */
$oModal.on('mousedown.m1','.m1-disambig', function(e) {
	e.preventDefault();
});

/* clic hors du wrapper - ferme toutes les listes */
$oModal.on('click.m1',function(e) {
	if(!$(e.target).is('#Company, #Team, #Manager, #JobTitle') && !$(e.target).closest('.m1-disambig').length)
		$.each(oDisambigMap, function(sKey, sVal) { $(sVal).hide(); });
});

/* ---- SOFTWARE : User, lignes Software/Cost ---- */

/* User : résout l'utilisateur (fct=14) et affiche la désambiguïsation si besoin */
$oModal.on('change.m1 blur.m1','#User', function() { resolveUser(); });

/* User : choix parmi les homonymes */
$oModal.on('click.m1','input[name="userDisambig"]', function() { pickUser(this); });

/* Software (lignes dynamiques) : remplit le prix automatiquement (fct=11) */
$oModal.on('change.m1 blur.m1','.software-input', function() { fillSoftwarePrice(this); });

/* Boutons +/X : ajoute / supprime une ligne Software */
$oModal.on('click.m1','.btn-add-software',    function() { addSoftwareRow(); });
$oModal.on('click.m1','.btn-remove-software', function() { removeSoftwareRow(this); });

//****************************************************************//
//*** 4. REQUÊTES AJAX : CHARGEMENT DES LISTES (Datalists)     ***//
//****************************************************************//

/* Chaque load*List() POST fct=N → fctAjax (module1edit.phpi), puis remplace les <option> du <datalist> cible. */

/*** loadDatalist() - Fonction générique : POST fct=iFct, remplace le contenu du datalist sSelector. ***/
function loadDatalist(iFct, sSelector)
{
	$.ajax({
		type: "post",
		data: { 'fct': iFct },
		url: fctAjax,
		dataType: "html",
		success: function(data) {
			$(sSelector).empty().append(data);
		},
		error: function() { }
	});
}

function loadCompaniesList()  { loadDatalist(3,  '#companiesList');  }  // fct=3  : entreprises
function loadUsersList()      { loadDatalist(9,  '#usersList');      }  // fct=9  : employés onboardés (Software)
function loadSoftwaresList()  { loadDatalist(10, '#softwareList');   }  // fct=10 : logiciels référencés

/*** loadAllOnboardingDatalists() - Charge uniquement les listes indispensables à l'ouverture du formulaire.
     Les autres datalists (Team/JobTitle/Manager) se chargent en cascade via loadAfterCompany/loadAfterTeam. ***/
function loadAllOnboardingDatalists()
{
	loadCompaniesList();
}

//****************************************************************//
//*** 5. REQUÊTES AJAX : CASCADE COMPANY → TEAM → MANAGER      ***//
//****************************************************************//

/*** loadAfterCompany() [boarding.js → adapté] - Récupère les Teams de la Company (fct=16) et les affiche en radios sous #Team (pattern identique à #ManagerDisambig). Branchée via $(document).on('change', '#Company', ...). ***/
function loadAfterCompany()
{
	var sCompany = $('#Company').val();

	// Reset cascade aval
	$('#Team').val('');
	$('#JobTitle').val('');
	$('#Manager').val('');
	$('#teamsList').empty();
	$('#jobTitlesList').empty();
	$('#managersList').empty();
	sCompanyMailDomain = ''; // Réinitialise le domaine à chaque changement de société

	if(sCompany == '') {
		$("#d_team").css("display", 'none');
		$("#d_manager").css("display", 'none');
		$("#d_jobtitle").css("display", 'none');
		return;
	}

	$("#d_team").css("display", 'block');
	$("#d_manager").css("display", 'none');
	$("#d_jobtitle").css("display", 'none');

	// fct=19 (domaine email) PUIS fct=16 (teams) en chaîne pour éviter une race condition sur sCompanyMailDomain
	$.ajax({
		type: "post",
		data: { 'fct': 19, 'company': sCompany },
		url: fctAjax,
		dataType: "text",
		success: function(data) { sCompanyMailDomain = $.trim(data); },
		error:   function()     { sCompanyMailDomain = ''; },
		complete: function() {
			generateMail(); // Regénère le mail avec le domaine résolu (ou vide)

			$.ajax({
				type: "post",
				data: { 'fct': 16, 'company': sCompany },
				url: fctAjax,
				dataType: "html",
				success: function(data) {
					var aTeams = [];
					$('<div>').html(data).find('option').each(function() {
						var sVal = $(this).attr('value');
						if(sVal && $.inArray(sVal, aTeams) === -1) aTeams.push(sVal);
					});

					var oList = $('#teamsList');
					oList.empty();

					if(aTeams.length === 0) return;

					for(var j = 0; j < aTeams.length; j++)
						oList.append('<option value="' + aTeams[j] + '">' + aTeams[j] + '</option>');

					if(aTeams.length === 1) $('#Team').val(aTeams[0]).trigger('change');
				},
				error: function() { }
			});
		}
	});
}

/*** loadAfterTeam() [boarding.js → adapté] - Récupère les Job Titles (fct=17) en radios sous #JobTitle (pattern Manager/Team), et résout le manager. Branchée via $(document).on('change', '#Team', ...). ***/
function loadAfterTeam()
{
	var sCompany = $('#Company').val();
	var sTeam    = $('#Team').val();

	// Reset cascade aval
	$('#JobTitle').val('');
	$('#Manager').val('');
	$('#jobTitlesList').empty();
	$('#managersList').empty();

	if(sCompany == '' || sTeam == '') {
		$("#d_manager").css("display", 'none');
		$("#d_jobtitle").css("display", 'none');
		return;
	}

	$("#d_manager").css("display", 'block');
	$("#d_jobtitle").css("display", 'none');

	$.ajax({
		type: "post",
		data: { 'fct': 17, 'company': sCompany, 'team': sTeam },
		url: fctAjax,
		dataType: "html",
		success: function(data) {
			var aTitles = [];
			$('<div>').html(data).find('option').each(function() {
				var sVal = $(this).attr('value');
				if(sVal && $.inArray(sVal, aTitles) === -1) aTitles.push(sVal);
			});

			var oList = $('#jobTitlesList');
			oList.empty();
			if(aTitles.length === 0) return;

			for(var j = 0; j < aTitles.length; j++)
				oList.append('<option value="' + aTitles[j] + '">' + aTitles[j] + '</option>');

			// Auto-remplissage si un seul poste
			if(aTitles.length === 1) $('#JobTitle').val(aTitles[0]);
		},
		error: function(data) { }
	});

	resolveManager(sCompany, sTeam);
}

/*** resolveManager() - Résout le(s) manager(s) d'une équipe via AJAX (fct=18), peuplés dans #managersList. ***/
/*** 0 résultat → datalist vide ; 1 résultat → auto-remplissage ; 2+ → propositions dans le dropdown natif. ***/
function resolveManager(company, team)
{
	var oList = $('#managersList');
	oList.empty();

	if(company === '' || team === '') return;

	$.ajax({
		type: "post",
		data: { 'fct': 18, 'company': company, 'team': team },
		url: fctAjax,
		dataType: "text",
		success: function(data) {
			oList.empty(); // Annule l'effet d'un éventuel appel concurrent déjà résolu
			if($.trim(data) === '') return;

			var managers = $.trim(data).split('|');

			for(var j = 0; j < managers.length; j++)
				oList.append('<option value="' + managers[j] + '">' + managers[j] + '</option>');

			// Auto-remplissage si un seul manager → affiche directement Job Title
			if(managers.length === 1) {
				$('#Manager').val(managers[0]);
				$("#d_jobtitle").css("display", 'block');
			}
		},
		error: function() {}
	});
}

/*** pickManager() [MODULE \u2192 calqu\u00e9 sur pickUser()] \u2014 Action appel\u00e9e quand l'utilisateur choisit un manager parmi plusieurs. ***/
function pickManager(oRadio)
{
	$('#Manager').val($(oRadio).data('label'));
	$('#ManagerDisambig').hide();
	$("#d_jobtitle").css("display", 'block');
}

/*** changeDisplayOnError() [boarding.js → adapté] - Met le champ en rouge (txt-error [STYLE.CSS]) si doublon. Désactive #btnAdd/#btnUpdate ([FRAMEWORK] : IDs injectés par modal.js). ***/
function changeDisplayOnError(oTxtAera)
{
	if($(oTxtAera).attr('id') == 'Initials')
	{
		// Debounce 400ms : n'envoie la requête qu'après arrêt de frappe (pattern maison clearTimeout/setTimeout)
		clearTimeout(idInitialsCheckTimeout);
		idInitialsCheckTimeout = setTimeout(function() {
			var sVal = $(oTxtAera).val();
			$.ajax({
				type: "post",
				data: { 'fct': 12, 'initial': sVal, 'excludeId': $('input[name="Id"]').val() || '' },
				url: fctAjax,
				dataType: "html",
				success: function(data) {
					if(parseInt(data) > 0)
						$(oTxtAera).addClass("txt-error");
					else
						$(oTxtAera).removeClass("txt-error");
				},
				error: function() {}
			});
		}, 400);
	}
	else if($(oTxtAera).attr('id') == 'Mail')
	{
		// Debounce 400ms : vérifie l'unicité de l'email dans aADUsers et Onboarder (fct=13)
		clearTimeout(idMailCheckTimeout);
		idMailCheckTimeout = setTimeout(function() {
			var sVal = $(oTxtAera).val().trim();
			if(sVal === '') { $(oTxtAera).removeClass("txt-error"); return; }
			$.ajax({
				type: "post",
				data: { 'fct': 13, 'email': sVal, 'excludeId': $('input[name="Id"]').val() || '' },
				url: fctAjax,
				dataType: "html",
				success: function(data) {
					if(parseInt(data) > 0)
						$(oTxtAera).addClass("txt-error");
					else
						$(oTxtAera).removeClass("txt-error");
				},
				error: function() {}
			});
		}, 400);
	}
	else
	{
		/* Ne réactive le bouton que si aucun doublon d'employé n'est déjà marqué (txt-error sur les champs nom) */
		if(!$('#LastName').hasClass('txt-error') && !$('#FirstName').hasClass('txt-error') && !$('#AccountName').hasClass('txt-error'))
		{
			$('#btnAdd').prop("disabled", false);
			$('#btnUpdate').prop("disabled", false);
		}
	}
}

//****************************************************************//
//*** 6. RÈGLES MÉTIER : GÉNÉRATION AUTOMATIQUE                ***//
//****************************************************************//

/*** formatName() [boarding.js] - Met la première lettre de chaque mot en majuscule (ex: jean dupont -> Jean Dupont) ***/
function formatName(str)
{
	var splitStr = str.toLowerCase().split(' ');

	for (var i = 0; i < splitStr.length; i++)
	{
		splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
	}

	return splitStr.join(' ');
}

/*** onUsernameChange() [boarding.js → adapté] - Appelé quand le nom/prénom change : formate le texte et génère initiales et email ***/
function onUsernameChange()
{
	//*** Format FirstName ***

	$("#FirstName").val(formatName($("#FirstName").val()));

	//*** Format LastName ***

	$("#LastName").val(formatName($("#LastName").val()));

	//*** Generate Initials ***

	generateInitials();
	changeDisplayOnError($("#Initials"));

	//*** Generate Mail ***

	generateMail();
	changeDisplayOnError($("#Mail"));

	//*** Generate AccountName ***

	generateAccountName();

	//*** Verifie si l'employe existe deja (LastName+FirstName ou AccountName) dans aADUsers ou Onboarder ***

	checkOnboarderExists();
}

/*** checkOnboarderExists() [MODULE] - fct=15 : verifie via AJAX si LastName+FirstName ou AccountName existent deja dans dbo.aADUsers ou dbo.Onboarder. Marque les champs en rouge (txt-error) si doublon. ***/
function checkOnboarderExists()
{
	var sLastName    = $('#LastName').val().trim();
	var sFirstName   = $('#FirstName').val().trim();
	var sAccountName = $('#AccountName').val().trim();

	/* Reset visuel : pas de check possible si LastName ou FirstName vide */
	if(sLastName == '' || sFirstName == '')
	{
		$('#LastName').removeClass('txt-error');
		$('#FirstName').removeClass('txt-error');
		$('#AccountName').removeClass('txt-error');
		hideInfoMsg('.modal-alert');
		$('#btnAdd').prop('disabled', false).css('opacity', '');
		return;
	}

	$.ajax({
		type: "post",
		data: { 'fct': 15, 'lastName': sLastName, 'firstName': sFirstName, 'accountName': sAccountName, 'excludeId': $('input[name="Id"]').val() || '0' },
		url: fctAjax,
		dataType: "text",
		success: function(data) {
			/* Reponse format "accountname=N&fullname=M" */
			var iAccountNameExists = 0;
			var iFullNameExists    = 0;
			var aPairs = $.trim(data).split('&');
			for(var i = 0; i < aPairs.length; i++)
			{
				var aKV = aPairs[i].split('=');
				if(aKV[0] == 'accountname') iAccountNameExists = parseInt(aKV[1]) || 0;
				if(aKV[0] == 'fullname')    iFullNameExists    = parseInt(aKV[1]) || 0;
			}

			if(iAccountNameExists > 0) $('#AccountName').addClass('txt-error');
			else                       $('#AccountName').removeClass('txt-error');

			if(iFullNameExists > 0) { $('#LastName').addClass('txt-warning');    $('#FirstName').addClass('txt-warning'); }
			else                    { $('#LastName').removeClass('txt-warning'); $('#FirstName').removeClass('txt-warning'); }

			/* Doublon Account Name → blocage strict */
			if(iAccountNameExists > 0)
			{
				displayInfoMsg(true, 'This account name already exists in Active Directory and cannot be registered.', '.modal-alert');
				$('#btnAdd').prop('disabled', true).css('opacity', '0.5');
			}
			/* Doublon de nom uniquement → avertissement, déblocage possible via Initiales + Account Name uniques */
			else if(iFullNameExists > 0)
			{
				displayInfoMsg(true, 'Homonym detected: this name already exists. Ensure Initials and Account Name are unique to register this person.', '.modal-alert');
				$('#btnAdd').prop('disabled', false).css('opacity', '');
			}
			else
			{
				hideInfoMsg('.modal-alert');
				$('#btnAdd').prop('disabled', false).css('opacity', '');
			}
		},
		error: function() {}
	});
}

/*** generateInitials() [MODULE] - Crée automatiquement les 3 lettres d'initiales (1ère lettre Prénom + 1ère et dernière Nom) ***/
function generateInitials()
{
	var sFirstName = $('#FirstName').val().trim();
	var sLastName = $('#LastName').val().trim();

	if(sFirstName != '' && sLastName != '')
	{
		var sInitials = (sFirstName.charAt(0) + sLastName.charAt(0) + sLastName.charAt(sLastName.length - 1)).toUpperCase();
		$('#Initials').val(sInitials);
		changeDisplayOnError($("#Initials"));
	}
}

/*** generateMail() [MODULE] - Construit automatiquement l'adresse e-mail (prenom.nom@company.lu) ***/
function generateMail()
{
	var sFirstName = $('#FirstName').val().trim().toLowerCase();
	var sLastName = $('#LastName').val().trim().toLowerCase();
	var sCompany = $('#Company').val().trim();

	if(sFirstName != '' && sLastName != '' && sCompany != '')
	{
		var sDomain = (sCompanyMailDomain !== '') ? sCompanyMailDomain : sCompany.toLowerCase().replace(/\s+/g, '') + '.lu';
		var sMail = sFirstName + '.' + sLastName + '@' + sDomain;
		$('#Mail').val(sMail);
		changeDisplayOnError($("#Mail"));
	}
}

/*** generateAccountName() [MODULE] - Remplit AccountName avec le nom de famille en minuscules ***/
function generateAccountName()
{
	var sLastName = $('#LastName').val().trim().toLowerCase();
	if(sLastName != '')
		$('#AccountName').val(sLastName);
}

//****************************************************************//
//*** 7. LOGIQUE SPÉCIFIQUE : FORMULAIRE LOGICIELS             ***//
//****************************************************************//

/*** fillSoftwarePrice() [MODULE] - Recherche en AJAX (fct=11) le prix d'un logiciel dans bApplicationPrice pour remplir le champ Cost automatiquement ***/
function fillSoftwarePrice(oInput)
{
	var sApp = $(oInput).val();
	var oCost = $(oInput).closest('.input-group').find('input[name="Cost[]"]');
	if(sApp == '') return;

	$.ajax({
		type: "post",
		data: { 'fct': 11, 'applicationName': sApp },
		url: fctAjax,
		dataType: "html",
		async: false,

		success: function(data) {
			if(data != '')
				oCost.val(data);
		},
		error: function(data) { }
	});
}

/*** addSoftwareRow() [MODULE] - Ajoute dynamiquement une nouvelle ligne (Software + Cost + bouton X). Classes Bootstrap : input-group [BOOTSTRAP], form-control [BOOTSTRAP], btn btn-danger [BOOTSTRAP]. ***/
function addSoftwareRow()
{
	var sRow = ''
		+ '<div class="input-group">'
		+   '<input type="text" class="form-control software-input" name="Software[]" list="softwareList" placeholder="Software">'
		+   '<input type="text" class="form-control cost-input" name="Cost[]" placeholder="Cost (€)">'
		+   '<button type="button" class="btn btn-danger btn-remove-software">X</button>'
		+ '</div>';
	$('#softwareRows').append(sRow);
}

/*** removeSoftwareRow() [MODULE] - Supprime une ligne Software du formulaire (sauf si c'est la dernière, dans ce cas vide les champs) ***/
function removeSoftwareRow(oBtn)
{
	var oRows = $('#softwareRows > .input-group');
	if(oRows.length <= 1)
	{
		$(oBtn).siblings('input').val('');
		return;
	}
	$(oBtn).closest('.input-group').remove();
}

/*** resolveUser() [MODULE] - Interroge le serveur (fct=14) pour trouver l'IdEmployee à partir du nom saisi, gère les homonymes. Classes STYLE.CSS : msg-success, msg-error [STYLE.CSS]. ***/
function resolveUser()
{
	var sName  = $('#User').val();
	var oHidden = $('#UserId');
	var oMsg    = $('#User').siblings('.msg-success');
	var oDisambig = $('#UserDisambig');

	// Réinitialise les champs et les messages
	oHidden.val('');
	oMsg.removeClass('msg-error').text('');
	oDisambig.hide().empty();

	if(sName == '') return;

	// Appel AJAX vers fct=14 (qui recherche le nom/prénom dans la base de données)
	var sRes = '';
	$.ajax({
		type: "post",
		data: { 'fct': 14, 'fullName': sName },
		url: fctAjax,
		dataType: "html",
		async: false,

		success: function(data) {
			sRes = data;
		},
		error: function(data) { }
	});

	if(sRes == '') {
		oMsg.addClass('msg-error').text('Server error');
		return;
	}

	// Analyse la réponse du serveur (format: userid=123;matches=123:Jean|456:Jean...)
	var sUserId  = '';
	var sMatches = '';
	var aVars = $.trim(sRes).split(';');
	for(var i = 0; i < aVars.length; i++)
	{
		var sChunk = $.trim(aVars[i]);
		var aPair = sChunk.split('=');
		if(aPair[0] == 'userid')  sUserId  = aPair[1];
		if(aPair[0] == 'matches') sMatches = sChunk.substring('matches='.length);
	}

	if(sUserId != '')
	{
		// Cas 1 : L'utilisateur a été trouvé et est unique, on valide
		oHidden.val(sUserId);
		oMsg.text('User OK (id ' + sUserId + ')');
		return;
	}

	if(sMatches == '')
	{
		// Cas 2 : Aucun utilisateur ne correspond à ce nom
		oMsg.addClass('msg-error').text('Unknown user');
		return;
	}

	// Cas 3 : Homonymes trouvés. On affiche des boutons radio pour forcer l'utilisateur à choisir.
	oMsg.addClass('msg-error').text('Several users - please pick one:');
	var aChoices = sMatches.split('|');
	for(var j = 0; j < aChoices.length; j++)
	{
		var aChoice = aChoices[j].split(':');
		if(aChoice.length < 2) continue;
		var sId    = aChoice[0];
		var sLabel = aChoice[1];
		oDisambig.append(
			'<label style="display:block; margin:2px 0;">' +
				'<input type="radio" name="userDisambig" value="' + sId + '" data-label="' + sLabel + '"> ' +
				sLabel +
			'</label>'
		);
	}
	oDisambig.show();
}

/*** pickUser() [MODULE] - Action appelée lorsqu'on choisit un utilisateur parmi une liste de plusieurs homonymes (liste générée par resolveUser) ***/
function pickUser(oRadio)
{
	$('#UserId').val($(oRadio).val());
	$('#User').val($(oRadio).data('label'));
	$('#UserDisambig').hide();
	$('#User').siblings('.msg-success').removeClass('msg-error').text('User OK (id ' + $(oRadio).val() + ')');
}
