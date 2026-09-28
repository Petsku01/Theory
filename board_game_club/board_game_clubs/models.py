from django.db import models
from django.contrib.auth.models import User

#Models go here

#Topic = BoardGame
#topic = board_game
#topics = boardgames
#Entry = BoardGameLending


class BoardGame(models.Model):
       """A Board Game the user is learning about."""
       name = models.CharField(max_length=200)
       company = models.CharField(max_length=50)
       lended = models.BooleanField()
       year_published = models.IntegerField()
       date_added = models.DateTimeField(auto_now_add=True)
       date_modified = models.DateTimeField(auto_now=True)
       owner = models.ForeignKey(User, on_delete=models.CASCADE)
       


       def __str__(self):
           """Return a string representation of the model."""
           return self.name


class BoardGameLending(models.Model):
    my_board_game_lending = models.TextField()
    date_added = models.DateTimeField(auto_now_add=True) #Maybe should be "date_lended"
    date_modified = models.DateTimeField(auto_now=True)
    board_game = models.ForeignKey(BoardGame, on_delete=models.CASCADE)
    lender = models.ForeignKey(User, on_delete=models.CASCADE)
    
    def __str__(self):
           """Return a string representation of the model."""
           return self.my_board_game_lending

    
    