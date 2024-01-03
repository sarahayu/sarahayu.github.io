import numpy as np
# import PyQt5
# import matplotlib
from matplotlib import pyplot as plt
from matplotlib.collections import LineCollection

from skyfield.api import Star, load, wgs84
from skyfield.api import N,S,E,W, wgs84
from skyfield.constants import GM_SUN_Pitjeva_2005_km3_s2 as GM_SUN
from skyfield.data import hipparcos, mpc, stellarium
from skyfield.projections import build_stereographic_projection

from matplotlib.widgets import Slider, Button

# matplotlib.use('Qt5Agg')

# The comet is plotted on several dates `t_comet`.  But the stars only
# need to be drawn once, so we take the middle comet date as the single
# time `t` we use for everything else.

ts = load.timescale()
t_comet = ts.utc(2020, 7, range(17, 27))
t = t_comet[len(t_comet) // 2]  # middle date

# An ephemeris from the JPL provides Sun and Earth positions.

eph = load('de421.bsp')
sun = eph['sun']

# The Minor Planet Center data file provides the comet orbit.

with load.open(mpc.COMET_URL) as f:
    comets = mpc.load_comets_dataframe(f)

comets = (comets.sort_values('reference')
          .groupby('designation', as_index=False).last()
          .set_index('designation', drop=False))

row = comets.loc['C/2020 F3 (NEOWISE)']
comet = sun + mpc.comet_orbit(row, ts, GM_SUN)

# The Hipparcos mission provides our star catalog.

with load.open(hipparcos.URL) as f:
    stars = hipparcos.load_dataframe(f)
    stars["hip"] = stars.index


# And the constellation outlines come from Stellarium.  We make a list
# of the stars at which each edge stars, and the star at which each edge
# ends.

url = ('https://raw.githubusercontent.com/Stellarium/stellarium/master'
       '/skycultures/modern_st/constellationship.fab')

with load.open(url) as f:
    constellations = stellarium.parse_constellations(f)

exclude = ["Her", "Aur", "Boo", "Cam", "Lyn", "Peg", "Vul", "And", "Sge", "Per", "CVn", "Del", "Vul", "Lac", "Aql", "Cep"]

edges = [edge for name, edges in constellations for edge in edges if name not in exclude]
names = [name for name, edges in constellations for edge in edges if name not in exclude]

hip_to_const = {}

for name_, edges_ in constellations:
    if name_ in exclude:
        continue
    for star1, star2 in edges_:
        hip_to_const[star1] = name_
        hip_to_const[star2] = name_

edges_star1 = [star1 for star1, star2 in edges]
edges_star2 = [star2 for star1, star2 in edges]

# We will center the chart on the comet's middle position.

earth = eph['earth'] + wgs84.latlon(80 * N, (91.0603 + 341.8) * W)

center = earth.at(t).from_altaz(alt_degrees=90, az_degrees=0) #.observe(comet).apparent()
projection = build_stereographic_projection(center)
field_of_view_degrees = 120.0
limiting_magnitude = 4.5

# Now that we have constructed our projection, compute the x and y
# coordinates that each star and the comet will have on the plot.

star_positions = earth.at(t).observe(Star.from_dataframe(stars))
stars['x'], stars['y'] = projection(star_positions)

# stars['x'] = stars['x'] + 0.25

comet_x, comet_y = projection(earth.at(t_comet).observe(comet).apparent())

# Create a True/False mask marking the stars bright enough to be
# included in our plot.  And go ahead and compute how large their
# markers will be on the plot.

bright_stars = (stars.magnitude <= limiting_magnitude)
magnitude = stars['magnitude'][bright_stars]
marker_size = (0.5 + limiting_magnitude - magnitude) ** 2.0

# The constellation lines will each begin at the x,y of one star and end
# at the x,y of another.  We have to "rollaxis" the resulting coordinate
# array into the shape that matplotlib expects.

xy1 = stars[['x', 'y']].loc[edges_star1].values
xy2 = stars[['x', 'y']].loc[edges_star2].values
lines_xy = np.rollaxis(np.array([xy1, xy2]), 1)

# Time to build the figure!

fig, ax = plt.subplots(figsize=[7, 5])

# Draw the constellation lines.

starline = ax.add_collection(LineCollection(lines_xy, colors='#00f2'))

# Draw the stars.

starscat = ax.scatter(stars['x'][bright_stars], stars['y'][bright_stars],
           s=marker_size, color='k')

# Draw the comet positions, and label them with dates.

comet_color = '#f00'
offset = 0.002

# ax.plot(comet_x, comet_y, '+', c=comet_color, zorder=3)

# for xi, yi, tstr in zip(comet_x, comet_y, t_comet.utc_strftime('%m/%d')):
#     tstr = tstr.lstrip('0')
#     text = ax.text(xi + offset, yi - offset, tstr, color=comet_color,
#                    ha='left', va='top', fontsize=9, weight='bold', zorder=-1)
#     text.set_alpha(0.5)

# Finally, title the plot and set some final parameters.


axcont = plt.axes([0.25, 0.05, 0.65, 0.03])

cont = Slider(axcont, 'Phi', 0.0, 360.0, 354.5)

def update(val):
    global lines_xy, stars
    phi = cont.val

    # We will center the chart on the comet's middle position.

    earth = eph['earth'] + wgs84.latlon(80 * N, (91.0603 + phi) * W)

    center = earth.at(t).from_altaz(alt_degrees=90, az_degrees=0) #.observe(comet).apparent()
    projection = build_stereographic_projection(center)
    field_of_view_degrees = 90.0
    limiting_magnitude = 4.0

    # Now that we have constructed our projection, compute the x and y
    # coordinates that each star and the comet will have on the plot.

    star_positions = earth.at(t).observe(Star.from_dataframe(stars))
    stars['x'], stars['y'] = projection(star_positions)

    # stars['x'] = stars['x'] + 0.25

    comet_x, comet_y = projection(earth.at(t_comet).observe(comet).apparent())

    # Create a True/False mask marking the stars bright enough to be
    # included in our plot.  And go ahead and compute how large their
    # markers will be on the plot.

    bright_stars = (stars.magnitude <= limiting_magnitude)
    magnitude = stars['magnitude'][bright_stars]
    marker_size = (0.5 + limiting_magnitude - magnitude) ** 2.0

    # The constellation lines will each begin at the x,y of one star and end
    # at the x,y of another.  We have to "rollaxis" the resulting coordinate
    # array into the shape that matplotlib expects.

    xy1 = stars[['x', 'y']].loc[edges_star1].values
    xy2 = stars[['x', 'y']].loc[edges_star2].values
    lines_xy = np.rollaxis(np.array([xy1, xy2]), 1)

    # Time to build the figure!

    fig, ax = plt.subplots(figsize=[7, 5])

    # Draw the constellation lines.

    starline.set_segments(lines_xy)

    # Draw the stars.

    starscat.set_offsets(np.column_stack((stars['x'][bright_stars], stars['y'][bright_stars])))

    # ax.scatter(stars['x'][bright_stars], stars['y'][bright_stars],
    #         s=marker_size, color='k')

    # Draw the comet positions, and label them with dates.

    comet_color = '#f00'
    offset = 0.002

    # ax.plot(comet_x, comet_y, '+', c=comet_color, zorder=3)

    # for xi, yi, tstr in zip(comet_x, comet_y, t_comet.utc_strftime('%m/%d')):
    #     tstr = tstr.lstrip('0')
    #     text = ax.text(xi + offset, yi - offset, tstr, color=comet_color,
    #                    ha='left', va='top', fontsize=9, weight='bold', zorder=-1)
    #     text.set_alpha(0.5)

    # Finally, title the plot and set some final parameters.


cont.on_changed(update)

angle = np.pi - field_of_view_degrees / 360.0 * np.pi
limit = np.sin(angle) / (1.0 - np.cos(angle))

ax.set_xlim(-limit * 1.4, limit * 1.4)
ax.set_ylim(-limit, limit)
ax.xaxis.set_visible(False)
ax.yaxis.set_visible(False)
# ax.set_aspect(1.0 / 1.4)
ax.set_title('Comet NEOWISE {} through {}'.format(
    t_comet[0].utc_strftime('%Y %B %d'),
    t_comet[-1].utc_strftime('%Y %B %d'),
))

# plt.show()

np.savetxt("lines.py", lines_xy.reshape(-1,2))
stars[bright_stars].to_csv("stars.py")

# print(lines_xy)
# print(stars['x'][bright_stars])
# print(stars['y'][bright_stars])

# Save.

# fig.savefig('neowise-finder-chart.png', bbox_inches='tight')

LINES = lines_xy.reshape(-1)

def inrange(x, y, a):
    return a >= x and a <= y

MINX = -0.63751158760607973
MAXX = 0.34922302581535134
MINY = -0.3117778833447993
MAXY = 0.3702554006321211

# MINX, MAXX = ax.get_xlim()
# MINY, MAXY = ax.get_ylim()

print(MINX)
print(MAXX)
print(MINY)
print(MAXY)

newlines = []

def containss(line):
    return any(x for x in newlines if (x["line"][0] == line[0] and x["line"][1] == line[1] and x["line"][2] == line[2] and x["line"][3] == line[3]) or (x["line"][0] == line[2] and x["line"][1] == line[3] and x["line"][2] == line[0] and x["line"][3] == line[1]))

for i in range(0, len(LINES), 4):
    x1 = LINES[i + 0]
    y1 = LINES[i + 1]
    x2 = LINES[i + 2]
    y2 = LINES[i + 3]
    name = names[i // 4]
    if np.isnan(x1) or np.isnan(y1) or np.isnan(x2) or np.isnan(y2):
        continue
    if inrange(MINX, MAXX, x1) and inrange(MINX, MAXX, x2) and inrange(MINY, MAXY, y1) and inrange(MINY, MAXY, y2):
        line = {
            "name": name,
            "line": [
                x1,
                y1,
                x2,
                y2
            ]
        }
        if not containss(line["line"]):
            newlines.append(line)

newconst = {}

for line in newlines:
    if line["name"] not in newconst:
        newconst[line["name"]] = []
    newconst[line["name"]].extend(line["line"])

newconst = [{ "name": name, "lines": newconst[name] } for name in newconst ]

with open("lines.js", "w") as linesfile:
    linesfile.write(f"export const LINES = {newconst}")

STARS = np.reshape(stars[bright_stars].to_numpy(), -1)

newstars = []
for i in range(0, len(STARS), 11):
    if np.isnan(STARS[i + 0]) or np.isnan(STARS[i + 8]) or np.isnan(STARS[i + 9]) or np.isnan(STARS[i + 10]):
        continue
    if inrange(MINX, MAXX, STARS[i + 9]) and inrange(MINY, MAXY, STARS[i + 10]):
        if STARS[i + 8] not in hip_to_const:
            newstars.append({
                "const": "nan",
                "mag": STARS[i] + 4,
                "hip": STARS[i + 8],
                "x": STARS[i + 9],
                "y": STARS[i + 10],
            })
        else:
            newstars.append({
                "const": hip_to_const[STARS[i + 8]],
                "mag": STARS[i],
                "hip": STARS[i + 8],
                "x": STARS[i + 9],
                "y": STARS[i + 10],
            })



newnewstars = {}

for star in newstars:
    if star["const"] not in newnewstars:
        newnewstars[star["const"]] = []
    newnewstars[star["const"]].append({
            "mag": star["mag"],
            "hip": star["hip"],
            "x": star["x"],
            "y": star["y"]
        })

newnewstars = [{ "const": name, "stars": newnewstars[name] } for name in newnewstars ]

with open("stars.js", "w") as starsfile:
    starsfile.write(f"export const STARS = {newnewstars}")