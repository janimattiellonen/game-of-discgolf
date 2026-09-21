# Disc types

I'd like to introduce different types of discs: putter, mid ranges and drivers.

The player could have 1 disc of each type. Each disc would fly a bit differently. 

Things that the disc model could contain initially:
- maximum distance
- ease of control
- amount of skip/sliding

The maximum distance doesn't have to be a hard limit. Each disc type could have an approximate max distance with a 
certain randomness to it. For example: sometimes a throw might make the disc fly a bit farther than normally.

Later on, if we add player skill levels and other factors, we might have to make changes.

Let's make the initial version pretty simple but with some level of randomness.

## Putters

- slowest discs
- for putting and very controlled shots


## Midranges
- longer distances than putter put also for controlled shots

## Drivers
- for longer drives with acceptance of some lost control
- most difficult to control
- skips generally more than the other types due to it's wide rim


Reference on disc types: https://www.innovadiscs.com/home/disc-golf-faq/disc-types-overview/

Create a spec using skill "agent-skills:spec". Store the spec in "/specs".
