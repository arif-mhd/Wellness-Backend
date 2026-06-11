#!/bin/sh
exec /usr/bin/supertokens start --foreground --port=${PORT:-3567}
