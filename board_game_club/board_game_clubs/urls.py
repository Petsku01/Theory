"""Defines URL patterns for board_game_clubs"""
from django.urls import path
from . import views

app_name = 'board_game_clubs'


urlpatterns = [
    # Home page
    path('', views.index, name='index'),
    # Page that shows all board games.
    path('board_games/', views.boardGames, name='board_games'),
    #detail page for a SINGLE board game
    path('board_game/<int:board_game_id>/', views.boardGame, name='board_game'),
    #Page for adding new board game
    path('new_board_game/', views.newBoardGame, name='new_board_game'),
    # Page for adding a new lending
    path('new_lending/<int:board_game_id>/', views.newLending, name='new_lending'),
    # Page for editing a lending.
    path('edit_lending/<int:board_game_lending_id>/', views.editLending, name='edit_lending'),
    # Page for editing a board game.
    path('edit_board_game/<int:board_game_id>/', views.editBoardGame, name='edit_board_game'),
]


    