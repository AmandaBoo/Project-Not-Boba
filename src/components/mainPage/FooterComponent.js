import React from 'react';
import IconButton from "@mui/material/IconButton";

export const FooterComponent = ({onCookieClick}) => {
    return (
        <footer className={'footer flex-center'}>
            {createKofiIcon()}
            {createPaypalIcon()}
            {createCookiePolicyIcon(onCookieClick)}
            {createDiscordIcon()}
        </footer>
    )
}

function createKofiIcon() {
    return (
        <a href={"https://ko-fi.com/kitbon" } target="_blank">
            <IconButton>
                <img
                    src={'./images/icons/kofiRound.png'}
                    alt={'kofi-icon'}
                    className={'footer-icons'}
                />
            </IconButton>
        </a>
    );
}

function createPaypalIcon() {
    return (
        <a href={"https://ko-fi.com/kitbon" } target="_blank">
            <IconButton>
                <img
                    src={'./images/icons/paypal.png'}
                    alt={'paypal-icon'}
                    className={'footer-icons'}
                />
            </IconButton>
        </a>
    );
}

function createCookiePolicyIcon(onCookieClick) {
    return (
        <IconButton>
            <img
                src={'./images/icons/cookie.png'}
                alt={'cookie-icon'}
                className={'footer-icons'}
                onClick={() => onCookieClick()}
            />
        </IconButton>
    );
}

function createDiscordIcon() {
    return (
        <IconButton>
            <img
                src={'./images/icons/discordIcon.png'}
                alt={'discord-icon'}
                className={'discord-icon'}
            />
        </IconButton>
    );
}

