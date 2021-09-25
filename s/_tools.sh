#!/usr/bin/bash

test -t 0
IS_TTY=$?

function tput_tty() {
    if [ "0" == "$IS_TTY" ]; then
        tput "$@"
    fi
}

function echo_error() {
    tput_tty setaf 1
    echo "$@"
    tput_tty sgr0
}

function echo_warn() {
    tput_tty setaf 3
    echo "$@"
    tput_tty sgr0
}

function echo_info() {
    tput_tty bold
    echo "$@"
    tput_tty sgr0
}

function echo_good() {
    tput_tty setaf 2
    echo "$@"
    tput_tty sgr0
}
