class SuperEnergyDrink extends DeusExPickup;

var float speedBoostDuration;
var float invincibilityDuration;

function bool Use()
{
    local DeusExPlayer Player;
    local float maxHealth;

    Player = DeusExPlayer(GetPlayerPawn());
    if (Player != None)
    {
        // Restore full health
        maxHealth = Player.default.Health;
        Player.HealPlayer(maxHealth, True); // Heals to max health, ignoring current value

        // Apply speed boost (like Speed Enhancement aug)
        Player.GroundSpeed *= 2.0; // Double movement speed
        Player.JumpZ *= 1.5; // Increase jump height
        Player.SetTimer(speedBoostDuration, False, 1); // Timer to reset speed

        // Apply temporary invincibility
        Player.ReducedDamageType = 'All'; // Resist all damage types
        Player.SetTimer(invincibilityDuration, False, 2); // Timer to reset invincibility

        // Feedback to player
        Player.ClientMessage("You feel like a GOD!");

        // Reduce item count (allow multiple uses)
        NumCopies--;
        if (NumCopies <= 0)
            Destroy();

        return True;
    }
    return False;
}

// Timer function to reset buffs
function Timer()
{
    local DeusExPlayer Player;
    Player = DeusExPlayer(GetPlayerPawn());

    if (Player != None)
    {
        if (TimerID == 1) // Reset speed boost
        {
            Player.GroundSpeed = Player.default.GroundSpeed;
            Player.JumpZ = Player.default.JumpZ;
            Player.ClientMessage("Speed boost wears off.");
        }
        else if (TimerID == 2) // Reset invincibility
        {
            Player.ReducedDamageType = '';
            Player.ClientMessage("Invincibility wears off.");
        }
    }
}

defaultproperties
{
     maxCopies=5 // Allow 5 uses
     ItemName="Super Energy Drink (Overpowered)"
     PlayerViewOffset=(X=30.000000,Z=0.000000)
     PlayerViewMesh=LodMesh'DeusExItems.Sodacan'
     PickupViewMesh=LodMesh'DeusExItems.Sodacan'
     ThirdPersonMesh=LodMesh'DeusExItems.Sodacan'
     Icon=Texture'DeusExUI.Icons.BeltIconSodaCan'
     largeIcon=Texture'DeusExUI.Icons.LargeIconSodaCan'
     largeIconWidth=46
     largeIconHeight=36
     Description="An insanely powerful energy drink that makes you godlike."
     beltDescription="GODDRINK"
     Mesh=LodMesh'DeusExItems.Sodacan'
     CollisionRadius=3.000000
     CollisionHeight=4.500000
     Mass=10.000000
     Buoyancy=8.000000
     speedBoostDuration=15.000000 // 15 seconds of speed boost
     invincibilityDuration=10.000000 // 10 seconds of invincibility
}
