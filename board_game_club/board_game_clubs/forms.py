from django import forms
from .models import BoardGame, BoardGameLending
from django.forms.fields import IntegerField
from django.forms import widgets


class BoardGameForm(forms.ModelForm):
    class Meta:
        model = BoardGame
        fields = ['name', 'company', 'year_published', 'lended']
        labels = {'lended' : 'Borrowed'}

class BoardGameLendingForm(forms.ModelForm):
    class Meta:
        model = BoardGameLending
        fields = ['my_board_game_lending']
        labels = {'my_board_game_lending': 'Details:'}
        widgets = {'my_board_game_lending': forms.Textarea(attrs={'cols': 80})}