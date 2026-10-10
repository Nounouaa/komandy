import { Routes } from '@angular/router';

import { PublicLayout } from './layouts/public-layout/public-layout';
import { ClientLayout } from './layouts/client-layout/client-layout';
import { RestaurantLayout } from './layouts/restaurant-layout/restaurant-layout';

import { roleGuard } from './core/guards/role-guard';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [

  /* =========================================================
   * 🧪 Page de test (à supprimer plus tard)
   * ========================================================= */
  {
    path: 'test-komandy',
    loadComponent: () =>
      import('./features/test-komandy/test-komandy').then((m) => m.TestKomandy),
  },

  /* =========================================================
   * 🏠 SITE PUBLIC
   * ========================================================= */
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./accueil/accueil').then((m) => m.Accueil),
      },
      {
        path: 'apropos',
        loadComponent: () => import('./apropos/apropos').then((m) => m.Apropos),
      },
      {
        path: 'contact',
        loadComponent: () => import('./contact/contact').then((m) => m.Contact),
      },
    ],
  },

  /* =========================================================
   * 🔐 AUTHENTIFICATION
   * ========================================================= */
  {
    path: 'connexion',
    loadComponent: () =>
      import('./connexion/connexion').then((m) => m.Connexion),
    title: 'Connexion',
  },
  {
    path: 'inscription',
    loadComponent: () =>
      import('./inscription/inscription').then((m) => m.Inscription),
    title: 'Inscription',
  },
  {
    path: 'inscription/client',
    loadComponent: () =>
      import('./inscription-client/inscription-client').then((m) => m.InscriptionClient),
    title: 'Inscription client',
  },
  {
    path: 'inscription/restaurant',
    loadComponent: () =>
      import('./inscription-restaurant/inscription-restaurant').then((m) => m.InscriptionRestaurant),
    title: 'Inscription restaurant',
  },

  /* =========================================================
   * 👤 ESPACE CLIENT (protégé)
   * ========================================================= */
  {
    path: 'client',
    component: ClientLayout,
    canActivate: [authGuard, roleGuard('client')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      /* --- Dashboard --- */
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard-client/dashboard/dashboard').then((m) => m.Dashboard),
      },

      /* --- Restaurants --- */
      {
        path: 'restaurants',
        loadComponent: () =>
          import('./restaurants/restaurants').then((m) => m.Restaurants),
      },
      {
        path: 'restaurants/:id',
        loadComponent: () =>
          import('./restaurant-detail/restaurant-detail/restaurant-detail')
            .then((m) => m.RestaurantDetail),
      },

      /* --- Panier --- */
      {
        path: 'panier',
        loadComponent: () =>
          import('./panier/panier/panier').then((m) => m.Panier),
      },

      /* --- Commandes --- */
      {
        path: 'commandes',
        loadComponent: () =>
          import('./mes-commandes/mes-commandes').then((m) => m.MesCommandes),
      },

      /* --- Favoris --- */
      {
        path: 'favoris',
        loadComponent: () =>
          import('./favoris/favoris').then((m) => m.Favoris),
      },

      /* --- Promotions --- */
      {
        path: 'promotions',
        loadComponent: () =>
          import('./promotions/promotions').then((m) => m.Promotions),
      },

      /* --- Profil --- */
      {
        path: 'profil',
        loadComponent: () =>
          import('./profil-client/profil-client').then((m) => m.ProfilClient),
        title: 'Mon profil',
      },

      /* --- Amis --- */
      {
        path: 'amis',
        loadComponent: () =>
          import('./amis/amis/amis').then((m) => m.Amis),
        title: 'Amis',
      },

      /* --- Messages (liste des conversations + recherche) --- */
      {
        path: 'messages',
        loadComponent: () =>
          import('./messages-list/messages-list/messages-list').then((m) => m.MessagesList),
        data: { context: 'client' },
        title: 'Messages',
      },

      /* --- Chat (une conversation) --- */
      {
        path: 'messages/:id',
        loadComponent: () =>
          import('./chat/chat/chat').then((m) => m.Chat),
        data: { context: 'client' },
        title: 'Discussion',
      },
    ],
  },

  /* =========================================================
   * 🏪 ESPACE RESTAURANT (protégé)
   * ========================================================= */
  {
    path: 'restaurant',
    component: RestaurantLayout,
    canActivate: [authGuard, roleGuard('restaurant')],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      /* --- Dashboard --- */
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard-restaurant/dashboard/dashboard').then((m) => m.Dashboard),
      },

      /* --- Produits --- */
      {
        path: 'produits',
        loadComponent: () =>
          import('./dashboard-restaurant/produits/produits').then((m) => m.Produits),
      },

      /* --- Commandes --- */
      {
        path: 'commandes',
        loadComponent: () =>
          import('./dashboard-restaurant/commandes/commandes').then((m) => m.Commandes),
      },

      /* --- Promotions --- */
      {
        path: 'promotions',
        loadComponent: () =>
          import('./dashboard-restaurant/promotions/promotions/promotions')
            .then((m) => m.PromotionsResto),
      },

      /* --- Clients --- */
      {
        path: 'clients',
        loadComponent: () =>
          import('./restaurant-client/restaurant-client').then((m) => m.RestaurantClient),
      },

      /* --- Statistiques --- */
      {
        path: 'statistiques',
        loadComponent: () =>
          import('./restaurant-statistique/restaurant-statistique')
            .then((m) => m.RestaurantStatistique),
      },

      /* --- Profil --- */
      {
        path: 'profil',
        loadComponent: () =>
          import('./profil-restaurant/profil-restaurant').then((m) => m.ProfilRestaurant),
      },

      /* --- Messages (liste des conversations) --- */
      {
        path: 'messages',
        loadComponent: () =>
          import('./messages-list/messages-list/messages-list').then((m) => m.MessagesList),
        data: { context: 'restaurant' },
        title: 'Messages',
      },

      /* --- Chat (une conversation) --- */
      {
        path: 'messages/:id',
        loadComponent: () =>
          import('./chat/chat/chat').then((m) => m.Chat),
        data: { context: 'restaurant' },
        title: 'Discussion',
      },
    ],
  },

  /* =========================================================
   * 404 — Redirection par défaut
   * ========================================================= */
  { path: '**', redirectTo: '' },
];