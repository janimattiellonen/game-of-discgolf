# Wind

When playing disc golf outside, you can throw with multiple techniques and angles (forehand, backhand, left hand, 
right hand, hyzer, anhyzer, grenade etc), In this game, at this point, assume right hand backhand throw. 

## Wind details
- tail wind
- head wind
- cross wind
- speed (strength)


## Wind speed

Wind speed is often measured in km/s or mph. I'm more accustomed to km/h but we can also use a simpler measuring
scale in this game, say 0-100, where 0 is calm and 100 is very windy. This has the problem that if we later on
want to support even stronger winds, we have to adjust all defined levels. If we use km/s (or mph) we don't have
to set an upper limit. We can also use a real wind scale that defines what is calm and what is a hurricane).

## Wind indicator

- an arrow showing the wind direction, rendered consistently with the isometric landscape
- wind speed indicator close to the arrow
- wind direction is not static and may fluctuate a bit. The arrow should show this in real life


## Wind characteristics
- the hole / level may have different areas with wind blowing in different directions
  - 1-3 areas to begin with. Let's see how well the work
- wind speed may fluctuate a bit, but normally not so much

## Wind areas

A wind area has an epicentre where the wind speed is strongest. The wind indicator is measured from the epicentre. 
The speed gradually diminished the further the wind is from the epicentre. Some kind of algorithm is required to 
calculate, where the effect of the wind is zero


## Disc flight in wind

Without going too deep into the anatomy of a disc flying in the air in different winds, we should establish a baseline
on how the wind affects a disc flight in this game.

At this point, we don't calculate in hyzer or anhyzer throws, which would increase how wind affect flights. 
For example throwing a disc in anhyzer in a headwind would case the disc to turn to the right very strongly 
(assuming a right hand backhand throw).


### Headwind

In a headwind, the disc's relative speed increases and thus causes the disc to become more understable and thus wanting
to turn to the right (assuming a right hand backhand throw).


### Tailwind

In a tailwind, the disc's relative speed decreases. The discs starts fading to left faster (assuming a right hand 
backhand throw).

### Crosswind

In a right to left crosswind, the disc will tend to move more to the left. In a left to right crosswind, the disc 
will tend to move more to the right.

Create a spec using skill "agent-skills:spec". Store the spec in "/specs".



