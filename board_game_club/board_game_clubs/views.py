from django.shortcuts import render, redirect
from .models import BoardGame, BoardGameLending
from .forms import BoardGameForm, BoardGameLendingForm
from django.contrib.auth.decorators import login_required
from django.http import Http404

# Create your views here.
# Topic = BoardGame
# topics = board_games
# topic = board_game
# Entry = BoardGameLending




def index(request):
    """ Home page for board_game_clubs"""
    return render(request, 'board_game_clubs/index.html')

@login_required
def boardGames(request):
    """Show all topics."""
    board_games = BoardGame.objects.order_by('date_added')
    context = {'board_games': board_games}
    return render(request, 'board_game_clubs/board_games.html', context)

@login_required
def boardGame(request, board_game_id):
    """ Page for singular board game"""
    board_game = BoardGame.objects.get(id=board_game_id)
    board_game_lendings = board_game.boardgamelending_set.order_by('-date_added') # Not an entry_set!!! Use boardgamelending_set
    context = {'board_game': board_game, 'board_game_lendings': board_game_lendings}
    return render(request, 'board_game_clubs/board_game.html', context)

@login_required
def newBoardGame(request):
    """ Add new board game. """
    if request.method != 'POST':
        #No data submitted, create a blank form.
        form = BoardGameForm()
    else:
        #POST data submitted; process data.
        form = BoardGameForm(data = request.POST)
        if form.is_valid():
            new_board_game = form.save(commit=False)
            new_board_game.owner = request.user
            new_board_game.save()
        return redirect('board_game_clubs:board_games')
    #Display a blank or invalid form.
    context = {'form': form}
    return render(request, 'board_game_clubs/new_board_game.html', context)

@login_required
def newLending(request, board_game_id):
    """Mark board game as borrowed"""
    board_game = BoardGame.objects.get(id=board_game_id)
    if request.method != 'POST':
        # No data submitted; create a blank form.
        form = BoardGameLendingForm()
    else:
        # POST data submitted; process data.
        form = BoardGameLendingForm(data=request.POST)
        if form.is_valid():
            new_lending = form.save(commit=False)
            new_lending.board_game = board_game
            new_lending.lender = request.user
            new_lending.save()
            return redirect('board_game_clubs:board_game', board_game_id=board_game_id)
    # Display a blank or invalid form.
    context = {'board_game': board_game, 'form': form}
    return render(request, 'board_game_clubs/new_lending.html', context)

@login_required
def editLending(request, board_game_lending_id):
    """Edit an existing entry."""
    board_game_lending = BoardGameLending.objects.get(id=board_game_lending_id)
    board_game = board_game_lending.board_game
    if board_game_lending.lender != request.user:
        raise Http404
    if request.method != 'POST':
        # Initial request; pre-fill form with the current entry.
        form = BoardGameLendingForm(instance=board_game_lending)
    else:
        # POST data submitted; process data.
        form = BoardGameLendingForm(instance=board_game_lending, data=request.POST)
        if form.is_valid():
            form.save()
            return redirect('board_game_clubs:board_game', board_game_id=board_game.id)
              
    context = {'board_game_lending': board_game_lending, 'board_game': board_game, 'form': form}
    return render(request, 'board_game_clubs/edit_lending.html', context)

@login_required
def editBoardGame(request, board_game_id):
    """Edit an existing entry."""
    board_game = BoardGame.objects.get(id=board_game_id)
    if board_game.owner != request.user:
        raise Http404
    if request.method != 'POST':
        # Initial request; pre-fill form with the current entry.
        form = BoardGameForm(instance=board_game)
    else:
        # POST data submitted; process data.
        form = BoardGameForm(instance=board_game, data=request.POST)
        if form.is_valid():
            form.save()
            return redirect('board_game_clubs:board_game', board_game_id=board_game.id)
              
    context = {'board_game': board_game, 'form': form}
    return render(request, 'board_game_clubs/edit_board_game.html', context)