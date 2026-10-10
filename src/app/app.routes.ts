import { Routes } from '@angular/router';
import { PublicLayout } from './layouts/public-layout/public-layout';
import { ClientLayout } from './layouts/client-layout/client-layout';
import { RestaurantLayout } from './layouts/restaurant-layout/restaurant-layout';
import { roleGuard } from './core/guards/role-guard';
import { authGuard } from './core/guards/auth-guard';


export const routes: Routes = [

  // =========================================================
  // 🧪 Page de test (à supprimer plus tard)
  // =========================================================
  {
    path: 'test-komandy',
    loadComponent: () =>
      import('./features/test-komandy/test-komandy').then(m => m.TestKomandy),
  },

  // =========================================================
  // 🏠 SITE PUBLIC (Accueil, À propos, Contact)
  // =========================================================
  {
    path: '',
    component: PublicLayout,
    children: [
      { path: '',        loadComponent: () => import('./accueil/accueil').then(m => m.Accueil) },
      { path: 'apropos', loadComponent: () => import('./apropos/apropos').then(m => m.Apropos) },
      { path: 'contact', loadComponent: () => import('./contact/contact').then(m => m.Contact) },
    ],
  },

  // =========================================================
  // 🔐 AUTHENTIFICATION
  // =========================================================
  {
    path: 'connexion',
    loadComponent: () =>
      import('./connexion/connexion').then(m => m.Connexion),
    title: 'Connexion',
  },
  {
    path: 'inscription',
    loadComponent: () =>
      import('./inscription/inscription').then(m => m.Inscription),
    title: 'Inscription',
  },
  {
    path: 'inscription/client',
    loadComponent: () =>
      import('./inscription-client/inscription-client').then(m => m.InscriptionClient),
    title: 'Inscription client',
  },
  {
    path: 'inscription/restaurant',
    loadComponent: () =>
      import('./inscription-restaurant/inscription-restaurant').then(m => m.InscriptionRestaurant),
    title: 'Inscription restaurant',
  },

  // =========================================================
  // 👤 ESPACE CLIENT (protégé)
  // =========================================================
  {
    path: 'client',
    component: ClientLayout,
    canActivate: [authGuard, roleGuard('client')],   // ✅ ajouté
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard-client/dashboard/dashboard').then(m => m.Dashboard),
      },


      {
  path: 'restaurants/:id',
  loadComponent: () =>
    import('./restaurant-detail/restaurant-detail/restaurant-detail').then(m => m.RestaurantDetail),
},
{
  path: 'panier',
  loadComponent: () =>
    import('./panier/panier/panier').then(m => m.Panier),
},
      {
        path: 'restaurants',
        loadComponent: () =>
          import('./restaurants/restaurants').then(m => m.Restaurants),
      },
      {
        path: 'commandes',
        loadComponent: () =>
          import('./mes-commandes/mes-commandes').then(m => m.MesCommandes),
      },
      {
        path: 'favoris',
        loadComponent: () =>
          import('./favoris/favoris').then(m => m.Favoris),
      },
      {
        path: 'promotions',
        loadComponent: () =>
          import('./promotions/promotions').then(m => m.Promotions),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./profil-client/profil-client').then(m => m.ProfilClient),
        title: 'Mon profil',
      },

      {
  path: 'amis',
  loadComponent: () => import('./amis/amis/amis').then((m) => m.Amis),
},
{
  path: 'messages/:id',
  loadComponent: () => import('./chat/chat/chat').then((m) => m.Chat),
},
    ],
  },

  // =========================================================
  // 🏪 ESPACE RESTAURANT (protégé)
  // =========================================================
  {
    path: 'restaurant',
    component: RestaurantLayout,
    canActivate: [authGuard, roleGuard('restaurant')],   // ✅ ajouté
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard-restaurant/dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'produits',
        loadComponent: () =>
          import('./dashboard-restaurant/produits/produits').then(m => m.Produits),
      },
      {
        path: 'commandes',
        loadComponent: () =>
          import('./dashboard-restaurant/commandes/commandes').then(m => m.Commandes),
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./restaurant-client/restaurant-client').then(m => m.RestaurantClient),
      },
      {
        path: 'statistiques',
        loadComponent: () =>
          import('./restaurant-statistique/restaurant-statistique')
            .then(m => m.RestaurantStatistique),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./profil-restaurant/profil-restaurant').then(m => m.ProfilRestaurant),
      },

      {
  path: 'promotions',
  loadComponent: () =>
    import('./dashboard-restaurant/promotions/promotions/promotions')
      .then(m => m.PromotionsResto),
},
    ],
  },

  // =========================================================
  // 404 — Redirection par défaut
  // =========================================================
  { path: '**', redirectTo: '' },


  
];